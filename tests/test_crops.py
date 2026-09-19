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


def create_field(
    client: TestClient,
    farm_id: int,
    name: str = "North Field",
) -> int:
    response = client.post(
        "/api/v1/fields",
        json={
            "farm_id": farm_id,
            "name": name,
            "size_acres": 10.0,
            "soil_type": "Loam",
            "status": "Active",
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_crop(
    client: TestClient,
    field_id: int,
    *,
    name: str = "Tomatoes",
    variety: str = "Roma",
    planting_date: str | None = "2026-04-15",
    expected_harvest_date: str | None = "2026-08-15",
    growth_stage: str = "Vegetative",
    crop_status: str = "Growing",
) -> dict:
    response = client.post(
        "/api/v1/crops",
        json={
            "field_id": field_id,
            "name": name,
            "variety": variety,
            "planting_date": planting_date,
            "expected_harvest_date": expected_harvest_date,
            "growth_stage": growth_stage,
            "status": crop_status,
            "notes": "Monitor irrigation twice each week.",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_crop_for_valid_field(client: TestClient):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)

    crop = create_crop(client, field_id)

    assert crop["field_id"] == field_id
    assert crop["name"] == "Tomatoes"
    assert crop["variety"] == "Roma"
    assert crop["status"] == "Growing"
    assert crop["growth_stage"] == "Vegetative"


def test_create_crop_rejects_unknown_field(client: TestClient):
    response = client.post(
        "/api/v1/crops",
        json={
            "field_id": 999,
            "name": "Tomatoes",
            "status": "Growing",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Field not found."


def test_create_crop_rejects_harvest_before_planting(
    client: TestClient,
):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)

    response = client.post(
        "/api/v1/crops",
        json={
            "field_id": field_id,
            "name": "Tomatoes",
            "planting_date": "2026-09-15",
            "expected_harvest_date": "2026-09-14",
            "status": "Growing",
        },
    )

    assert response.status_code == 422


def test_list_crops_only_returns_requested_farm_crops(
    client: TestClient,
):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_field_id = create_field(client, first_farm_id, "North Field")
    second_field_id = create_field(client, second_farm_id, "South Field")

    first_crop = create_crop(
        client,
        first_field_id,
        name="Tomatoes",
    )
    create_crop(
        client,
        second_field_id,
        name="Sweet Corn",
    )

    response = client.get(f"/api/v1/crops?farm_id={first_farm_id}")

    assert response.status_code == 200

    crops = response.json()

    assert len(crops) == 1
    assert crops[0]["id"] == first_crop["id"]
    assert crops[0]["field_id"] == first_field_id


def test_list_crops_filters_by_field_and_status(
    client: TestClient,
):
    farm_id = create_farm(client)
    first_field_id = create_field(client, farm_id, "North Field")
    second_field_id = create_field(client, farm_id, "South Field")

    matching_crop = create_crop(
        client,
        first_field_id,
        name="Tomatoes",
        crop_status="Growing",
    )
    create_crop(
        client,
        first_field_id,
        name="Lettuce",
        crop_status="Planted",
    )
    create_crop(
        client,
        second_field_id,
        name="Sweet Corn",
        crop_status="Growing",
    )

    response = client.get(
        f"/api/v1/crops?farm_id={farm_id}"
        f"&field_id={first_field_id}&status=Growing"
    )

    assert response.status_code == 200

    crops = response.json()

    assert len(crops) == 1
    assert crops[0]["id"] == matching_crop["id"]
    assert crops[0]["field_id"] == first_field_id
    assert crops[0]["status"] == "Growing"


def test_update_crop_preserves_unsent_values(client: TestClient):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)
    crop = create_crop(client, field_id)

    response = client.put(
        f"/api/v1/crops/{crop['id']}",
        json={
            "growth_stage": "Flowering",
            "status": "Growing",
        },
    )

    assert response.status_code == 200

    updated_crop = response.json()

    assert updated_crop["growth_stage"] == "Flowering"
    assert updated_crop["status"] == "Growing"
    assert updated_crop["name"] == "Tomatoes"
    assert updated_crop["variety"] == "Roma"
    assert updated_crop["planting_date"] == "2026-04-15"
    assert updated_crop["expected_harvest_date"] == "2026-08-15"

def test_update_crop_rejects_harvest_before_existing_planting_date(
    client: TestClient,
):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)
    crop = create_crop(
        client,
        field_id,
        planting_date="2026-04-15",
        expected_harvest_date="2026-08-15",
    )

    response = client.put(
        f"/api/v1/crops/{crop['id']}",
        json={"expected_harvest_date": "2026-04-14"},
    )

    assert response.status_code == 422
    assert response.json()["detail"] == (
        "Expected harvest date cannot be before planting date."
    )
def test_delete_crop_removes_it(client: TestClient):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)
    crop = create_crop(client, field_id)

    delete_response = client.delete(f"/api/v1/crops/{crop['id']}")

    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/crops/{crop['id']}")

    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Crop not found."