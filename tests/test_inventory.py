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


def create_inventory_item(
    client: TestClient,
    farm_id: int,
    *,
    name: str = "Tomato Seeds",
    category: str = "Seeds",
    quantity: float = 4,
    unit: str = "packets",
    reorder_level: float = 5,
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
            "supplier": "Local Seed Co.",
            "expiry_date": "2027-01-30",
            "notes": "Store in a cool, dry place.",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_inventory_item_for_valid_farm(client: TestClient):
    farm_id = create_farm(client)

    item = create_inventory_item(client, farm_id)

    assert item["farm_id"] == farm_id
    assert item["name"] == "Tomato Seeds"
    assert item["category"] == "Seeds"
    assert item["quantity"] == 4
    assert item["reorder_level"] == 5
    assert item["is_low_stock"] is True


def test_create_inventory_item_rejects_unknown_farm(
    client: TestClient,
):
    response = client.post(
        "/api/v1/inventory",
        json={
            "farm_id": 999,
            "name": "Tomato Seeds",
            "category": "Seeds",
            "quantity": 4,
            "unit": "packets",
            "reorder_level": 5,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."


def test_list_inventory_only_returns_requested_farm_items(
    client: TestClient,
):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_item = create_inventory_item(
        client,
        first_farm_id,
        name="Tomato Seeds",
    )
    create_inventory_item(
        client,
        second_farm_id,
        name="Corn Seeds",
    )

    response = client.get(f"/api/v1/inventory?farm_id={first_farm_id}")

    assert response.status_code == 200

    items = response.json()

    assert len(items) == 1
    assert items[0]["id"] == first_item["id"]
    assert items[0]["farm_id"] == first_farm_id


def test_list_inventory_filters_by_category(client: TestClient):
    farm_id = create_farm(client)

    seed_item = create_inventory_item(
        client,
        farm_id,
        name="Tomato Seeds",
        category="Seeds",
    )
    create_inventory_item(
        client,
        farm_id,
        name="Organic Fertilizer",
        category="Fertilizer",
    )

    response = client.get(
        f"/api/v1/inventory?farm_id={farm_id}&category=Seeds"
    )

    assert response.status_code == 200

    items = response.json()

    assert len(items) == 1
    assert items[0]["id"] == seed_item["id"]
    assert items[0]["category"] == "Seeds"


def test_low_stock_includes_quantity_equal_to_reorder_level(
    client: TestClient,
):
    farm_id = create_farm(client)

    equal_item = create_inventory_item(
        client,
        farm_id,
        name="Fertilizer",
        category="Fertilizer",
        quantity=10,
        unit="bags",
        reorder_level=10,
    )
    create_inventory_item(
        client,
        farm_id,
        name="Healthy Seed Stock",
        category="Seeds",
        quantity=20,
        unit="packets",
        reorder_level=5,
    )

    response = client.get(f"/api/v1/inventory/low-stock?farm_id={farm_id}")

    assert response.status_code == 200

    items = response.json()

    assert len(items) == 1
    assert items[0]["id"] == equal_item["id"]
    assert items[0]["is_low_stock"] is True


def test_low_stock_is_filtered_by_farm(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_farm_item = create_inventory_item(
        client,
        first_farm_id,
        name="Tomato Seeds",
        quantity=2,
        reorder_level=5,
    )
    create_inventory_item(
        client,
        second_farm_id,
        name="Corn Seeds",
        quantity=1,
        reorder_level=5,
    )

    response = client.get(
        f"/api/v1/inventory/low-stock?farm_id={first_farm_id}"
    )

    assert response.status_code == 200

    items = response.json()

    assert len(items) == 1
    assert items[0]["id"] == first_farm_item["id"]
    assert items[0]["farm_id"] == first_farm_id


def test_updating_quantity_updates_low_stock_status(
    client: TestClient,
):
    farm_id = create_farm(client)

    item = create_inventory_item(
        client,
        farm_id,
        quantity=20,
        reorder_level=5,
    )

    assert item["is_low_stock"] is False

    response = client.put(
        f"/api/v1/inventory/{item['id']}",
        json={"quantity": 5},
    )

    assert response.status_code == 200

    updated_item = response.json()

    assert updated_item["quantity"] == 5
    assert updated_item["is_low_stock"] is True


def test_delete_inventory_item_removes_it(client: TestClient):
    farm_id = create_farm(client)
    item = create_inventory_item(client, farm_id)

    delete_response = client.delete(f"/api/v1/inventory/{item['id']}")

    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/inventory/{item['id']}")

    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Inventory item not found."