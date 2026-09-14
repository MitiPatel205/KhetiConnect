from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.crop import Crop
from app.models.farm import Farm
from app.models.field import Field
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskResponse, TaskUpdate
from app.models.worker import Worker

router = APIRouter(
    prefix="/tasks",
    tags=["Tasks"]
)


def validate_task_relationships(
    farm_id: int,
    field_id: int | None,
    crop_id: int | None,
    worker_id: int | None,
    db: Session
):
    farm = db.get(Farm, farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    if field_id is not None:
        field = db.get(Field, field_id)

        if field is None or field.farm_id != farm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Field does not belong to this farm."
            )

    if crop_id is not None:
        crop = db.get(Crop, crop_id)

        if crop is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Crop not found."
            )

        if field_id is not None and crop.field_id != field_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Crop does not belong to this field."
            )
    if worker_id is not None:
        worker = db.get(Worker, worker_id)

        if worker is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Worker not found."
            )

        if worker.farm_id != farm_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Worker does not belong to this farm."
            )

@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED
)
def create_task(
    task_data: TaskCreate,
    db: Session = Depends(get_db)
):
    validate_task_relationships(
        task_data.farm_id,
        task_data.field_id,
        task_data.crop_id,
        task_data.worker_id,
        db
    )

    task = Task(**task_data.model_dump())

    if task.status == "Completed":
        task.completed_at = datetime.utcnow()

    db.add(task)
    db.commit()
    db.refresh(task)
    return task


@router.get(
    "",
    response_model=list[TaskResponse]
)
def list_tasks(
    farm_id: int | None = Query(default=None, gt=0),
    task_status: str | None = Query(default=None, alias="status"),
    priority: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Task)

    if farm_id is not None:
        query = query.filter(Task.farm_id == farm_id)

    if task_status is not None:
        query = query.filter(Task.status == task_status)

    if priority is not None:
        query = query.filter(Task.priority == priority)

    return query.order_by(Task.due_date.asc()).all()


@router.get(
    "/{task_id}",
    response_model=TaskResponse
)
def get_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    return task


@router.put(
    "/{task_id}",
    response_model=TaskResponse
)
def update_task(
    task_id: int,
    task_data: TaskUpdate,
    db: Session = Depends(get_db)
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    update_values = task_data.model_dump(exclude_unset=True)

    new_field_id = update_values.get("field_id", task.field_id)
    new_crop_id = update_values.get("crop_id", task.crop_id)
    new_worker_id = update_values.get("worker_id", task.worker_id)

    validate_task_relationships(
        task.farm_id,
        new_field_id,
        new_crop_id,
        new_worker_id,
        db
    )

    for field_name, value in update_values.items():
        setattr(task, field_name, value)

    if task.status == "Completed" and task.completed_at is None:
        task.completed_at = datetime.utcnow()

    if task.status != "Completed":
        task.completed_at = None

    db.commit()
    db.refresh(task)
    return task


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db)
):
    task = db.get(Task, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found."
        )

    db.delete(task)
    db.commit()