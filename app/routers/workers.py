from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.farm import Farm
from app.models.task import Task
from app.models.worker import Worker
from app.schemas.worker import WorkerCreate, WorkerResponse, WorkerUpdate

router = APIRouter(
    prefix="/workers",
    tags=["Workers"]
)


def get_worker_or_404(worker_id: int, db: Session) -> Worker:
    worker = db.get(Worker, worker_id)

    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found."
        )

    return worker


@router.post(
    "",
    response_model=WorkerResponse,
    status_code=status.HTTP_201_CREATED
)
def create_worker(
    worker_data: WorkerCreate,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, worker_data.farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    worker = Worker(**worker_data.model_dump())

    db.add(worker)
    db.commit()
    db.refresh(worker)
    return worker


@router.get(
    "",
    response_model=list[WorkerResponse]
)
def list_workers(
    farm_id: int | None = Query(default=None, gt=0),
    is_active: bool | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Worker)

    if farm_id is not None:
        query = query.filter(Worker.farm_id == farm_id)

    if is_active is not None:
        query = query.filter(Worker.is_active == is_active)

    return query.order_by(Worker.name.asc()).all()


@router.get(
    "/{worker_id}",
    response_model=WorkerResponse
)
def get_worker(
    worker_id: int,
    db: Session = Depends(get_db)
):
    return get_worker_or_404(worker_id, db)


@router.put(
    "/{worker_id}",
    response_model=WorkerResponse
)
def update_worker(
    worker_id: int,
    worker_data: WorkerUpdate,
    db: Session = Depends(get_db)
):
    worker = get_worker_or_404(worker_id, db)

    update_values = worker_data.model_dump(exclude_unset=True)

    for field_name, value in update_values.items():
        setattr(worker, field_name, value)

    db.commit()
    db.refresh(worker)
    return worker


@router.delete(
    "/{worker_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_worker(
    worker_id: int,
    db: Session = Depends(get_db)
):
    worker = get_worker_or_404(worker_id, db)

    db.query(Task).filter(
        Task.worker_id == worker.id
    ).update(
        {Task.worker_id: None},
        synchronize_session=False
    )

    db.delete(worker)
    db.commit()