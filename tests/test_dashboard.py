from fastapi.testclient import TestClient


def test_dashboard_summary_for_farm(client: TestClient):
    farm_response = client.post(
        "/api/v1/farms",
        json={
            "name": "Green Valley Farm",
            "location": "New Jersey",
            "size_acres": 25.5
        }
    )

    farm_id = farm_response.json()["id"]

    response = client.get(
        f"/api/v1/dashboard/summary?farm_id={farm_id}"
    )

    assert response.status_code == 200

    data = response.json()

    assert data["farm"]["id"] == farm_id
    assert data["farm"]["name"] == "Green Valley Farm"

    assert data["summary"]["total_fields"] == 0
    assert data["summary"]["active_crops"] == 0
    assert data["summary"]["open_tasks"] == 0
    assert data["summary"]["active_workers"] == 0
    assert data["summary"]["unassigned_open_tasks"] == 0
    assert data["summary"]["low_stock_items"] == 0
    assert data["summary"]["maintenance_due"] == 0

    assert data["upcoming_tasks"] == []


def test_dashboard_returns_404_for_unknown_farm(client: TestClient):
    response = client.get("/api/v1/dashboard/summary?farm_id=999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."