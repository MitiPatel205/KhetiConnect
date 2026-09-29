from fastapi.testclient import TestClient


def create_farm(
    client: TestClient,
    name: str = "Green Valley Farm",
) -> int:
    response = client.post(
        "/api/v1/farms",
        json={
            "name": name,
            "location": "New Jersey",
            "size_acres": 25.5,
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_equipment(
    client: TestClient,
    farm_id: int,
    *,
    name: str = "John Deere Tractor",
    asset_tag: str = "TR-001",
) -> int:
    response = client.post(
        "/api/v1/equipment",
        json={
            "farm_id": farm_id,
            "name": name,
            "category": "Tractor",
            "asset_tag": asset_tag,
            "condition": "Good",
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_maintenance_log(
    client: TestClient,
    equipment_id: int,
    *,
    service_date: str = "2026-09-15",
    description: str = "Oil change and filter replacement",
    cost: float = 180.00,
    provider: str = "Farm Equipment Service LLC",
    notes: str = "Next service due in three months.",
) -> dict:
    response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": equipment_id,
            "service_date": service_date,
            "description": description,
            "cost": cost,
            "provider": provider,
            "notes": notes,
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_maintenance_log_for_valid_equipment(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)

    log = create_maintenance_log(client, equipment_id)

    assert log["equipment_id"] == equipment_id
    assert log["service_date"] == "2026-09-15"
    assert log["description"] == "Oil change and filter replacement"
    assert log["cost"] == 180.00
    assert log["provider"] == "Farm Equipment Service LLC"


def test_create_maintenance_log_rejects_unknown_equipment(
    client: TestClient,
):
    response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": 999,
            "service_date": "2026-09-15",
            "description": "Oil change",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Equipment not found."


def test_list_maintenance_logs_only_returns_requested_equipment(
    client: TestClient,
):
    farm_id = create_farm(client)
    first_equipment_id = create_equipment(
        client,
        farm_id,
        name="Tractor",
        asset_tag="TR-001",
    )
    second_equipment_id = create_equipment(
        client,
        farm_id,
        name="Water Pump",
        asset_tag="IP-001",
    )

    first_log = create_maintenance_log(
        client,
        first_equipment_id,
        description="Tractor oil change",
    )
    create_maintenance_log(
        client,
        second_equipment_id,
        description="Pump inspection",
    )

    response = client.get(
        f"/api/v1/maintenance-logs?equipment_id={first_equipment_id}"
    )

    assert response.status_code == 200

    logs = response.json()

    assert len(logs) == 1
    assert logs[0]["id"] == first_log["id"]
    assert logs[0]["equipment_id"] == first_equipment_id


def test_maintenance_logs_are_ordered_by_newest_service_date(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)

    older_log = create_maintenance_log(
        client,
        equipment_id,
        service_date="2026-06-01",
        description="Older service",
    )
    newer_log = create_maintenance_log(
        client,
        equipment_id,
        service_date="2026-09-01",
        description="Newer service",
    )

    response = client.get(
        f"/api/v1/maintenance-logs?equipment_id={equipment_id}"
    )

    assert response.status_code == 200

    logs = response.json()

    assert [log["id"] for log in logs] == [
        newer_log["id"],
        older_log["id"],
    ]


def test_partial_update_maintenance_log_preserves_other_fields(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    log = create_maintenance_log(client, equipment_id)

    response = client.put(
        f"/api/v1/maintenance-logs/{log['id']}",
        json={"cost": 225.50},
    )

    assert response.status_code == 200

    updated_log = response.json()

    assert updated_log["cost"] == 225.50
    assert updated_log["service_date"] == "2026-09-15"
    assert updated_log["description"] == "Oil change and filter replacement"
    assert updated_log["provider"] == "Farm Equipment Service LLC"
    assert updated_log["notes"] == "Next service due in three months."


def test_delete_maintenance_log_removes_it(client: TestClient):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    log = create_maintenance_log(client, equipment_id)

    delete_response = client.delete(
        f"/api/v1/maintenance-logs/{log['id']}"
    )

    assert delete_response.status_code == 204

    second_delete_response = client.delete(
        f"/api/v1/maintenance-logs/{log['id']}"
    )

    assert second_delete_response.status_code == 404
    assert second_delete_response.json()["detail"] == (
        "Maintenance log not found."
    )


def test_deleting_equipment_deletes_its_maintenance_logs(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    create_maintenance_log(client, equipment_id)

    delete_response = client.delete(f"/api/v1/equipment/{equipment_id}")

    assert delete_response.status_code == 204

    logs_response = client.get(
        f"/api/v1/maintenance-logs?equipment_id={equipment_id}"
    )

    assert logs_response.status_code == 200
    assert logs_response.json() == []

def create_inventory_item(
    client: TestClient,
    farm_id: int,
    *,
    name: str = "Engine Oil",
    category: str = "Lubricants",
    quantity: float = 10,
    unit: str = "liters",
    reorder_level: float = 2,
) -> dict:
    response = client.post(
        "/api/v1/inventory",
        json={
            "farm_id": farm_id,
            "name": name,
            "category": category,
            "quantity": quantity,
            "unit": unit,
            "reorder_level": reorder_level,
        },
    )

    assert response.status_code == 201
    return response.json()


def test_creating_maintenance_log_deducts_used_inventory(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    engine_oil = create_inventory_item(
        client,
        farm_id,
        quantity=10,
        unit="liters",
    )

    response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": equipment_id,
            "service_date": "2026-09-20",
            "description": "Tractor oil change",
            "parts_used": [
                {
                    "inventory_item_id": engine_oil["id"],
                    "quantity_used": 4,
                }
            ],
        },
    )

    assert response.status_code == 201

    log = response.json()

    assert len(log["parts_used"]) == 1
    assert log["parts_used"][0]["inventory_item_id"] == engine_oil["id"]
    assert log["parts_used"][0]["inventory_item_name"] == "Engine Oil"
    assert log["parts_used"][0]["unit"] == "liters"
    assert log["parts_used"][0]["quantity_used"] == 4

    item_response = client.get(f"/api/v1/inventory/{engine_oil['id']}")

    assert item_response.status_code == 200
    assert item_response.json()["quantity"] == 6


def test_creating_maintenance_log_rejects_insufficient_stock_without_changes(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    engine_oil = create_inventory_item(
        client,
        farm_id,
        quantity=3,
        unit="liters",
    )

    response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": equipment_id,
            "service_date": "2026-09-20",
            "description": "Tractor oil change",
            "parts_used": [
                {
                    "inventory_item_id": engine_oil["id"],
                    "quantity_used": 4,
                }
            ],
        },
    )

    assert response.status_code == 422
    assert "Insufficient stock" in response.json()["detail"]

    item_response = client.get(f"/api/v1/inventory/{engine_oil['id']}")

    assert item_response.status_code == 200
    assert item_response.json()["quantity"] == 3

    logs_response = client.get(
        f"/api/v1/maintenance-logs?equipment_id={equipment_id}"
    )

    assert logs_response.status_code == 200
    assert logs_response.json() == []


def test_creating_maintenance_log_rejects_inventory_from_another_farm(
    client: TestClient,
):
    equipment_farm_id = create_farm(client, "Green Valley Farm")
    inventory_farm_id = create_farm(client, "Riverbend Farm")
    equipment_id = create_equipment(client, equipment_farm_id)
    engine_oil = create_inventory_item(
        client,
        inventory_farm_id,
        quantity=10,
    )

    response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": equipment_id,
            "service_date": "2026-09-20",
            "description": "Tractor oil change",
            "parts_used": [
                {
                    "inventory_item_id": engine_oil["id"],
                    "quantity_used": 2,
                }
            ],
        },
    )

    assert response.status_code == 422
    assert "same farm" in response.json()["detail"]

    item_response = client.get(f"/api/v1/inventory/{engine_oil['id']}")

    assert item_response.status_code == 200
    assert item_response.json()["quantity"] == 10


def test_deleting_maintenance_log_restores_used_inventory(
    client: TestClient,
):
    farm_id = create_farm(client)
    equipment_id = create_equipment(client, farm_id)
    oil_filter = create_inventory_item(
        client,
        farm_id,
        name="Oil Filter",
        category="Parts",
        quantity=3,
        unit="filters",
    )

    log_response = client.post(
        "/api/v1/maintenance-logs",
        json={
            "equipment_id": equipment_id,
            "service_date": "2026-09-20",
            "description": "Replace oil filter",
            "parts_used": [
                {
                    "inventory_item_id": oil_filter["id"],
                    "quantity_used": 1,
                }
            ],
        },
    )

    assert log_response.status_code == 201

    deducted_item_response = client.get(
        f"/api/v1/inventory/{oil_filter['id']}"
    )

    assert deducted_item_response.status_code == 200
    assert deducted_item_response.json()["quantity"] == 2

    delete_response = client.delete(
        f"/api/v1/maintenance-logs/{log_response.json()['id']}"
    )

    assert delete_response.status_code == 204

    restored_item_response = client.get(
        f"/api/v1/inventory/{oil_filter['id']}"
    )

    assert restored_item_response.status_code == 200
    assert restored_item_response.json()["quantity"] == 3