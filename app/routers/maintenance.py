from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.equipment import Equipment
from app.models.maintenance import MaintenanceLog
from app.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogResponse,
    MaintenanceLogUpdate,
)

router = APIRouter(
    prefix="/maintenance-logs",
    tags=["Maintenance Logs"],
)


@router.post(
    "",
    response_model=MaintenanceLogResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_log(
    log_data: MaintenanceLogCreate,
    db: Session = Depends(get_db),
):
    equipment = db.get(Equipment, log_data.equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found.",
        )

    log = MaintenanceLog(**log_data.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@router.get(
    "",
    response_model=list[MaintenanceLogResponse],
)
def list_maintenance_logs(
    equipment_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(MaintenanceLog)

    if equipment_id is not None:
        query = query.filter(MaintenanceLog.equipment_id == equipment_id)

    return query.order_by(MaintenanceLog.service_date.desc()).all()


@router.put(
    "/{log_id}",
    response_model=MaintenanceLogResponse,
)
def update_maintenance_log(
    log_id: int,
    log_data: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
):
    log = db.get(MaintenanceLog, log_id)

    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )

    for field_name, value in log_data.model_dump(
        exclude_unset=True
    ).items():
        setattr(log, field_name, value)

    db.commit()
    db.refresh(log)
    return log


@router.delete(
    "/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    log = db.get(MaintenanceLog, log_id)

    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )

    db.delete(log)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)