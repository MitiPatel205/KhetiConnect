from fastapi.testclient import TestClient


def create_farm(client: TestClient, name: str = "Green Valley Farm") -> int:
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


def create_worker(
    client: TestClient,
    farm_id: int,
    name: str = "Aarav Patel",
) -> int:
    response = client.post(
        "/api/v1/workers",
        json={
            "farm_id": farm_id,
            "name": name,
            "role": "Farmhand",
            "phone": "555-0100",
            "email": f"{name.lower().replace(' ', '.')}@example.com",
            "hire_date": "2026-01-15",
            "is_active": True,
            "notes": "Certified to operate tractors.",
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_task(
    client: TestClient,
    farm_id: int,
    worker_id: int | None = None,
    title: str = "Inspect irrigation lines",
) -> int:
    response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": farm_id,
            "worker_id": worker_id,
            "title": title,
            "due_date": "2026-09-15",
            "priority": "High",
            "status": "To Do",
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def test_create_and_list_workers_for_farm(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_worker_id = create_worker(client, first_farm_id)
    create_worker(client, second_farm_id, "Maya Shah")

    response = client.get(f"/api/v1/workers?farm_id={first_farm_id}")

    assert response.status_code == 200

    workers = response.json()

    assert len(workers) == 1
    assert workers[0]["id"] == first_worker_id
    assert workers[0]["farm_id"] == first_farm_id
    assert workers[0]["name"] == "Aarav Patel"
    assert workers[0]["is_active"] is True


def test_create_worker_rejects_unknown_farm(client: TestClient):
    response = client.post(
        "/api/v1/workers",
        json={
            "farm_id": 999,
            "name": "Aarav Patel",
            "role": "Farmhand",
            "is_active": True,
        },
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "Farm not found."


def test_task_can_be_assigned_to_worker_from_same_farm(client: TestClient):
    farm_id = create_farm(client)
    worker_id = create_worker(client, farm_id)

    task_id = create_task(client, farm_id, worker_id)

    response = client.get(f"/api/v1/tasks/{task_id}")

    assert response.status_code == 200
    assert response.json()["worker_id"] == worker_id


def test_task_rejects_worker_from_different_farm(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")
    second_farm_worker_id = create_worker(client, second_farm_id, "Maya Shah")

    response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": first_farm_id,
            "worker_id": second_farm_worker_id,
            "title": "Invalid worker assignment",
            "priority": "Medium",
            "status": "To Do",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Worker does not belong to this farm."


def test_task_can_be_unassigned(client: TestClient):
    farm_id = create_farm(client)
    worker_id = create_worker(client, farm_id)
    task_id = create_task(client, farm_id, worker_id)

    response = client.put(
        f"/api/v1/tasks/{task_id}",
        json={"worker_id": None},
    )

    assert response.status_code == 200
    assert response.json()["worker_id"] is None


def test_deleting_worker_preserves_task_and_unassigns_it(client: TestClient):
    farm_id = create_farm(client)
    worker_id = create_worker(client, farm_id)
    task_id = create_task(client, farm_id, worker_id)

    delete_response = client.delete(f"/api/v1/workers/{worker_id}")

    assert delete_response.status_code == 204

    task_response = client.get(f"/api/v1/tasks/{task_id}")

    assert task_response.status_code == 200
    assert task_response.json()["id"] == task_id
    assert task_response.json()["worker_id"] is None

    workers_response = client.get(f"/api/v1/workers?farm_id={farm_id}")

    assert workers_response.status_code == 200
    assert workers_response.json() == []