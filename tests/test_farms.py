from fastapi.testclient import TestClient


def test_create_and_list_farms(client: TestClient):
    farm_data = {
        "name": "Green Valley Farm",
        "location": "New Jersey",
        "size_acres": 25.5,
        "notes": "Test farm"
    }

    create_response = client.post(
        "/api/v1/farms",
        json=farm_data
    )

    assert create_response.status_code == 201

    created_farm = create_response.json()

    assert created_farm["id"] == 1
    assert created_farm["name"] == farm_data["name"]
    assert created_farm["location"] == farm_data["location"]
    assert created_farm["size_acres"] == farm_data["size_acres"]

    list_response = client.get("/api/v1/farms")

    assert list_response.status_code == 200
    assert len(list_response.json()) == 1
    assert list_response.json()[0]["id"] == created_farm["id"]


def test_create_farm_rejects_invalid_size(client: TestClient):
    response = client.post(
        "/api/v1/farms",
        json={
            "name": "Invalid Farm",
            "size_acres": 0
        }
    )

    assert response.status_code == 422