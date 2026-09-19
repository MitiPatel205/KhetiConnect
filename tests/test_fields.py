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
    *,
    name: str = "North Field",
    size_acres: float = 10.0,
    soil_type: str = "Loam",
    field_status: str = "Active",
) -> dict:
    response = client.post(
        "/api/v1/fields",
        json={
            "farm_id": farm_id,
            "name": name,
            "size_acres": size_acres,
            "soil_type": soil_type,
            "status": field_status,
            "notes": "Best field for tomatoes and peppers.",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_field_for_valid_farm(client: TestClient):
    farm_id = create_farm(client)

    field = create_field(client, farm_id)

    assert field["farm_id"] == farm_id
    assert field["name"] == "North Field"
    assert field["size_acres"] == 10.0
    assert field["soil_type"] == "Loam"
    assert field["status"] == "Active"


def test_create_field_rejects_unknown_farm(client: TestClient):
    response = client.post(
        "/api/v1/fields",
        json={
            "farm_id": 999,
            "name": "North Field",
            "status": "Active",
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."


def test_list_fields_only_returns_requested_farm_fields(
    client: TestClient,
):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_field = create_field(
        client,
        first_farm_id,
        name="North Field",
    )
    create_field(
        client,
        second_farm_id,
        name="South Field",
    )

    response = client.get(f"/api/v1/fields?farm_id={first_farm_id}")

    assert response.status_code == 200

    fields = response.json()

    assert len(fields) == 1
    assert fields[0]["id"] == first_field["id"]
    assert fields[0]["farm_id"] == first_farm_id


def test_update_field_preserves_unsent_values(client: TestClient):
    farm_id = create_farm(client)
    field = create_field(client, farm_id)

    response = client.put(
        f"/api/v1/fields/{field['id']}",
        json={
            "status": "Resting",
            "notes": "Rest field after the harvest season.",
        },
    )

    assert response.status_code == 200

    updated_field = response.json()

    assert updated_field["status"] == "Resting"
    assert updated_field["notes"] == "Rest field after the harvest season."
    assert updated_field["name"] == "North Field"
    assert updated_field["size_acres"] == 10.0
    assert updated_field["soil_type"] == "Loam"


def test_delete_field_removes_it(client: TestClient):
    farm_id = create_farm(client)
    field = create_field(client, farm_id)

    delete_response = client.delete(f"/api/v1/fields/{field['id']}")

    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/fields/{field['id']}")

    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Field not found."