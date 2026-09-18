from datetime import date, timedelta

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
    category: str = "Tractor",
    asset_tag: str | None = "TR-001",
    condition: str = "Good",
    last_service_date: str | None = None,
    next_service_date: str | None = None,
) -> dict:
    response = client.post(
        "/api/v1/equipment",
        json={
            "farm_id": farm_id,
            "name": name,
            "category": category,
            "asset_tag": asset_tag,
            "condition": condition,
            "purchase_date": "2023-05-10",
            "last_service_date": last_service_date,
            "next_service_date": next_service_date,
            "notes": "Change oil every 200 operating hours.",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_equipment_for_valid_farm(client: TestClient):
    farm_id = create_farm(client)

    equipment = create_equipment(client, farm_id)

    assert equipment["farm_id"] == farm_id
    assert equipment["name"] == "John Deere Tractor"
    assert equipment["category"] == "Tractor"
    assert equipment["asset_tag"] == "TR-001"
    assert equipment["condition"] == "Good"
    assert equipment["is_maintenance_due"] is False


def test_create_equipment_rejects_unknown_farm(client: TestClient):
    response = client.post(
        "/api/v1/equipment",
        json={
            "farm_id": 999,
            "name": "John Deere Tractor",
            "category": "Tractor",
            "condition": "Good",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."


def test_equipment_asset_tag_must_be_unique(client: TestClient):
    farm_id = create_farm(client)

    create_equipment(
        client,
        farm_id,
        name="John Deere Tractor",
        asset_tag="TR-001",
    )

    response = client.post(
        "/api/v1/equipment",
        json={
            "farm_id": farm_id,
            "name": "Kubota Tractor",
            "category": "Tractor",
            "asset_tag": "TR-001",
            "condition": "Good",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Asset tag must be unique."


def test_list_equipment_only_returns_requested_farm_items(
    client: TestClient,
):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_equipment = create_equipment(
        client,
        first_farm_id,
        name="Tractor",
        asset_tag="TR-001",
    )
    create_equipment(
        client,
        second_farm_id,
        name="Irrigation Pump",
        asset_tag="IP-001",
    )

    response = client.get(f"/api/v1/equipment?farm_id={first_farm_id}")

    assert response.status_code == 200

    equipment = response.json()

    assert len(equipment) == 1
    assert equipment[0]["id"] == first_equipment["id"]
    assert equipment[0]["farm_id"] == first_farm_id


def test_list_equipment_filters_by_category(client: TestClient):
    farm_id = create_farm(client)

    tractor = create_equipment(
        client,
        farm_id,
        name="Tractor",
        category="Tractor",
        asset_tag="TR-001",
    )
    create_equipment(
        client,
        farm_id,
        name="Water Pump",
        category="Irrigation",
        asset_tag="IP-001",
    )

    response = client.get(
        f"/api/v1/equipment?farm_id={farm_id}&category=Tractor"
    )

    assert response.status_code == 200

    equipment = response.json()

    assert len(equipment) == 1
    assert equipment[0]["id"] == tractor["id"]
    assert equipment[0]["category"] == "Tractor"


def test_maintenance_due_includes_today_and_past_dates(
    client: TestClient,
):
    farm_id = create_farm(client)

    overdue_equipment = create_equipment(
        client,
        farm_id,
        name="Overdue Tractor",
        asset_tag="TR-001",
        next_service_date=(date.today() - timedelta(days=1)).isoformat(),
    )
    due_today_equipment = create_equipment(
        client,
        farm_id,
        name="Pump Due Today",
        asset_tag="IP-001",
        next_service_date=date.today().isoformat(),
    )
    create_equipment(
        client,
        farm_id,
        name="Future Tiller",
        asset_tag="TI-001",
        next_service_date=(date.today() + timedelta(days=30)).isoformat(),
    )

    response = client.get(
        f"/api/v1/equipment/maintenance-due?farm_id={farm_id}"
    )

    assert response.status_code == 200

    equipment = response.json()
    equipment_ids = {item["id"] for item in equipment}

    assert overdue_equipment["id"] in equipment_ids
    assert due_today_equipment["id"] in equipment_ids
    assert len(equipment) == 2

    assert all(item["is_maintenance_due"] is True for item in equipment)


def test_equipment_rejects_next_service_before_last_service(
    client: TestClient,
):
    farm_id = create_farm(client)

    response = client.post(
        "/api/v1/equipment",
        json={
            "farm_id": farm_id,
            "name": "John Deere Tractor",
            "category": "Tractor",
            "last_service_date": "2026-09-15",
            "next_service_date": "2026-09-14",
        },
    )

    assert response.status_code == 422


def test_update_and_delete_equipment(client: TestClient):
    farm_id = create_farm(client)
    equipment = create_equipment(client, farm_id)

    update_response = client.put(
        f"/api/v1/equipment/{equipment['id']}",
        json={
            "condition": "Needs Repair",
            "next_service_date": date.today().isoformat(),
        },
    )

    assert update_response.status_code == 200

    updated_equipment = update_response.json()

    assert updated_equipment["condition"] == "Needs Repair"
    assert updated_equipment["is_maintenance_due"] is True

    delete_response = client.delete(
        f"/api/v1/equipment/{equipment['id']}"
    )

    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/equipment/{equipment['id']}")

    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Equipment not found."