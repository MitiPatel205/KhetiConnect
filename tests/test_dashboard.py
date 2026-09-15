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
def test_dashboard_workforce_metrics(client: TestClient):
    farm_response = client.post(
        "/api/v1/farms",
        json={
            "name": "Green Valley Farm",
            "location": "New Jersey",
            "size_acres": 25.5,
        },
    )

    assert farm_response.status_code == 201
    farm_id = farm_response.json()["id"]

    active_worker_response = client.post(
        "/api/v1/workers",
        json={
            "farm_id": farm_id,
            "name": "Aarav Patel",
            "role": "Farmhand",
            "email": "aarav@example.com",
            "is_active": True,
        },
    )

    assert active_worker_response.status_code == 201
    active_worker_id = active_worker_response.json()["id"]

    inactive_worker_response = client.post(
        "/api/v1/workers",
        json={
            "farm_id": farm_id,
            "name": "Maya Shah",
            "role": "Equipment Operator",
            "email": "maya@example.com",
            "is_active": False,
        },
    )

    assert inactive_worker_response.status_code == 201

    assigned_task_response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": farm_id,
            "worker_id": active_worker_id,
            "title": "Inspect irrigation lines",
            "due_date": "2026-09-15",
            "priority": "High",
            "status": "To Do",
        },
    )

    assert assigned_task_response.status_code == 201

    unassigned_task_response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": farm_id,
            "title": "Restock fertilizer",
            "due_date": "2026-09-16",
            "priority": "Medium",
            "status": "In Progress",
        },
    )

    assert unassigned_task_response.status_code == 201

    completed_task_response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": farm_id,
            "title": "Clean storage shed",
            "due_date": "2026-09-10",
            "priority": "Low",
            "status": "Completed",
        },
    )

    assert completed_task_response.status_code == 201

    dashboard_response = client.get(
        f"/api/v1/dashboard/summary?farm_id={farm_id}"
    )

    assert dashboard_response.status_code == 200

    summary = dashboard_response.json()["summary"]

    assert summary["active_workers"] == 1
    assert summary["open_tasks"] == 2
    assert summary["unassigned_open_tasks"] == 1
    assert summary["completed_tasks"] == 1

def test_dashboard_returns_404_for_unknown_farm(client: TestClient):
    response = client.get("/api/v1/dashboard/summary?farm_id=999")

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."
