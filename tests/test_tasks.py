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
    name: str = "Tomatoes",
) -> int:
    response = client.post(
        "/api/v1/crops",
        json={
            "field_id": field_id,
            "name": name,
            "variety": "Roma",
            "planting_date": "2026-04-15",
            "expected_harvest_date": "2026-08-15",
            "growth_stage": "Vegetative",
            "status": "Growing",
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
            "is_active": True,
        },
    )

    assert response.status_code == 201
    return response.json()["id"]


def create_task(
    client: TestClient,
    farm_id: int,
    *,
    field_id: int | None = None,
    crop_id: int | None = None,
    worker_id: int | None = None,
    title: str = "Inspect irrigation lines",
    due_date: str | None = "2026-09-25",
    priority: str = "High",
    task_status: str = "To Do",
) -> dict:
    response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": farm_id,
            "field_id": field_id,
            "crop_id": crop_id,
            "worker_id": worker_id,
            "title": title,
            "description": "Check the drip irrigation system.",
            "due_date": due_date,
            "priority": priority,
            "status": task_status,
            "notes": "Check pressure and leaks.",
        },
    )

    assert response.status_code == 201
    return response.json()


def test_create_task_with_valid_relationships(client: TestClient):
    farm_id = create_farm(client)
    field_id = create_field(client, farm_id)
    crop_id = create_crop(client, field_id)
    worker_id = create_worker(client, farm_id)

    task = create_task(
        client,
        farm_id,
        field_id=field_id,
        crop_id=crop_id,
        worker_id=worker_id,
        title="Water tomato plants",
    )

    assert task["farm_id"] == farm_id
    assert task["field_id"] == field_id
    assert task["crop_id"] == crop_id
    assert task["worker_id"] == worker_id
    assert task["title"] == "Water tomato plants"
    assert task["priority"] == "High"
    assert task["status"] == "To Do"
    assert task["completed_at"] is None


def test_list_tasks_only_returns_requested_farm_tasks(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")

    first_task = create_task(
        client,
        first_farm_id,
        title="Inspect irrigation lines",
    )
    create_task(
        client,
        second_farm_id,
        title="Repair greenhouse fan",
    )

    response = client.get(f"/api/v1/tasks?farm_id={first_farm_id}")

    assert response.status_code == 200

    tasks = response.json()

    assert len(tasks) == 1
    assert tasks[0]["id"] == first_task["id"]
    assert tasks[0]["farm_id"] == first_farm_id


def test_list_tasks_filters_by_status_and_priority(client: TestClient):
    farm_id = create_farm(client)

    matching_task = create_task(
        client,
        farm_id,
        title="Urgent irrigation repair",
        priority="Urgent",
        task_status="In Progress",
    )
    create_task(
        client,
        farm_id,
        title="Low priority cleanup",
        priority="Low",
        task_status="To Do",
    )

    response = client.get(
        f"/api/v1/tasks?farm_id={farm_id}"
        "&status=In%20Progress&priority=Urgent"
    )

    assert response.status_code == 200

    tasks = response.json()

    assert len(tasks) == 1
    assert tasks[0]["id"] == matching_task["id"]
    assert tasks[0]["status"] == "In Progress"
    assert tasks[0]["priority"] == "Urgent"


def test_completing_and_reopening_task_updates_completed_at(
    client: TestClient,
):
    farm_id = create_farm(client)
    task = create_task(client, farm_id)

    complete_response = client.put(
        f"/api/v1/tasks/{task['id']}",
        json={"status": "Completed"},
    )

    assert complete_response.status_code == 200

    completed_task = complete_response.json()

    assert completed_task["status"] == "Completed"
    assert completed_task["completed_at"] is not None

    reopen_response = client.put(
        f"/api/v1/tasks/{task['id']}",
        json={"status": "To Do"},
    )

    assert reopen_response.status_code == 200

    reopened_task = reopen_response.json()

    assert reopened_task["status"] == "To Do"
    assert reopened_task["completed_at"] is None


def test_task_rejects_field_from_different_farm(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")
    second_farm_field_id = create_field(client, second_farm_id)

    response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": first_farm_id,
            "field_id": second_farm_field_id,
            "title": "Invalid field assignment",
            "priority": "Medium",
            "status": "To Do",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Field does not belong to this farm."


def test_task_rejects_worker_from_different_farm(client: TestClient):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")
    second_farm_worker_id = create_worker(
        client,
        second_farm_id,
        "Maya Shah",
    )

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

def test_task_rejects_crop_from_different_farm_without_field(
    client: TestClient,
):
    first_farm_id = create_farm(client)
    second_farm_id = create_farm(client, "Riverbend Farm")
    second_farm_field_id = create_field(client, second_farm_id)
    second_farm_crop_id = create_crop(
        client,
        second_farm_field_id,
        "Sweet Corn",
    )

    response = client.post(
        "/api/v1/tasks",
        json={
            "farm_id": first_farm_id,
            "crop_id": second_farm_crop_id,
            "title": "Invalid crop assignment",
            "priority": "Medium",
            "status": "To Do",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"] == "Crop does not belong to this farm."
def test_delete_task_removes_it(client: TestClient):
    farm_id = create_farm(client)
    task = create_task(client, farm_id)

    delete_response = client.delete(f"/api/v1/tasks/{task['id']}")

    assert delete_response.status_code == 204

    get_response = client.get(f"/api/v1/tasks/{task['id']}")

    assert get_response.status_code == 404
    assert get_response.json()["detail"] == "Task not found."
