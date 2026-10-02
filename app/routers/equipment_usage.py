from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.equipment import Equipment
from app.models.equipment_usage import EquipmentUsageLog
from app.models.field import Field
from app.models.worker import Worker
from app.schemas.equipment_usage import (
    EquipmentUsageCheckout,
    EquipmentUsageResponse,
    EquipmentUsageReturn,
)

router = APIRouter(
    prefix="/equipment-usage",
    tags=["Equipment Usage"],
)


def equipment_usage_response(usage: EquipmentUsageLog) -> dict:
    is_active = usage.checked_in_at is None

    is_overdue = (
        is_active
        and usage.expected_return_at is not None
        and usage.expected_return_at < datetime.utcnow()
    )

    return {
        "id": usage.id,
        "equipment_id": usage.equipment_id,
        "equipment_name": usage.equipment.name,
        "equipment_category": usage.equipment.category,
        "worker_id": usage.worker_id,
        "worker_name": usage.worker.name,
        "field_id": usage.field_id,
        "field_name": usage.field.name if usage.field is not None else None,
        "purpose": usage.purpose,
        "location": usage.location,
        "checked_out_at": usage.checked_out_at,
        "expected_return_at": usage.expected_return_at,
        "checked_in_at": usage.checked_in_at,
        "condition_out": usage.condition_out,
        "condition_in": usage.condition_in,
        "return_notes": usage.return_notes,
        "issue_reported": usage.issue_reported,
        "is_active": is_active,
        "is_overdue": is_overdue,
        "created_at": usage.created_at,
    }


def get_usage_with_relationships(
    usage_id: int,
    db: Session,
) -> EquipmentUsageLog | None:
    return (
        db.query(EquipmentUsageLog)
        .options(
            joinedload(EquipmentUsageLog.equipment),
            joinedload(EquipmentUsageLog.worker),
            joinedload(EquipmentUsageLog.field),
        )
        .filter(EquipmentUsageLog.id == usage_id)
        .first()
    )


@router.post(
    "/checkout",
    response_model=EquipmentUsageResponse,
    status_code=status.HTTP_201_CREATED,
)
def checkout_equipment(
    usage_data: EquipmentUsageCheckout,
    db: Session = Depends(get_db),
):
    equipment = db.get(Equipment, usage_data.equipment_id)

    if equipment is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found.",
        )

    worker = db.get(Worker, usage_data.worker_id)

    if worker is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Worker not found.",
        )

    if equipment.farm_id != worker.farm_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Equipment and worker must belong to the same farm.",
        )

    if not worker.is_active:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Inactive workers cannot check out equipment.",
        )

    if usage_data.field_id is not None:
        field = db.get(Field, usage_data.field_id)

        if field is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Field not found.",
            )

        if field.farm_id != equipment.farm_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    "Equipment, worker, and field must belong to the same farm."
                ),
            )

    if equipment.condition.lower() in {"needs repair", "out of service"}:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Equipment needs repair and cannot be checked out.",
        )

    active_usage = (
        db.query(EquipmentUsageLog)
        .filter(
            EquipmentUsageLog.equipment_id == equipment.id,
            EquipmentUsageLog.checked_in_at.is_(None),
        )
        .first()
    )

    if active_usage is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Equipment is already checked out.",
        )

    if (
        usage_data.expected_return_at is not None
        and usage_data.expected_return_at <= datetime.utcnow()
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Expected return time must be in the future.",
        )

    usage = EquipmentUsageLog(
        equipment_id=equipment.id,
        worker_id=worker.id,
        field_id=usage_data.field_id,
        purpose=usage_data.purpose,
        location=usage_data.location,
        expected_return_at=usage_data.expected_return_at,
        condition_out=usage_data.condition_out,
    )

    db.add(usage)
    db.commit()

    saved_usage = get_usage_with_relationships(usage.id, db)

    if saved_usage is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Equipment usage record could not be loaded after checkout.",
        )

    return equipment_usage_response(saved_usage)


@router.post(
    "/{usage_id}/return",
    response_model=EquipmentUsageResponse,
)
def return_equipment(
    usage_id: int,
    usage_data: EquipmentUsageReturn,
    db: Session = Depends(get_db),
):
    usage = get_usage_with_relationships(usage_id, db)

    if usage is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment usage record not found.",
        )

    if usage.checked_in_at is not None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Equipment has already been returned.",
        )

    try:
        usage.checked_in_at = datetime.utcnow()
        usage.condition_in = usage_data.condition_in
        usage.return_notes = usage_data.return_notes
        usage.issue_reported = usage_data.issue_reported

        if (
            usage_data.issue_reported
            or usage_data.condition_in.lower()
            in {"needs repair", "out of service"}
        ):
            usage.equipment.condition = "Needs Repair"
        else:
            usage.equipment.condition = usage_data.condition_in

        db.commit()
    except Exception:
        db.rollback()
        raise

    saved_usage = get_usage_with_relationships(usage_id, db)

    if saved_usage is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Equipment usage record could not be loaded after return.",
        )

    return equipment_usage_response(saved_usage)


@router.get(
    "",
    response_model=list[EquipmentUsageResponse],
)
def list_equipment_usage(
    farm_id: int | None = Query(default=None, gt=0),
    equipment_id: int | None = Query(default=None, gt=0),
    worker_id: int | None = Query(default=None, gt=0),
    active_only: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    query = db.query(EquipmentUsageLog).options(
        joinedload(EquipmentUsageLog.equipment),
        joinedload(EquipmentUsageLog.worker),
        joinedload(EquipmentUsageLog.field),
    )

    if farm_id is not None:
        query = query.join(EquipmentUsageLog.equipment).filter(
            Equipment.farm_id == farm_id,
        )

    if equipment_id is not None:
        query = query.filter(EquipmentUsageLog.equipment_id == equipment_id)

    if worker_id is not None:
        query = query.filter(EquipmentUsageLog.worker_id == worker_id)

    if active_only:
        query = query.filter(EquipmentUsageLog.checked_in_at.is_(None))

    usage_logs = query.order_by(
        EquipmentUsageLog.checked_out_at.desc(),
    ).all()

    return [equipment_usage_response(usage) for usage in usage_logs]


@router.get(
    "/{usage_id}",
    response_model=EquipmentUsageResponse,
)
def get_equipment_usage(
    usage_id: int,
    db: Session = Depends(get_db),
):
    usage = get_usage_with_relationships(usage_id, db)

    if usage is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment usage record not found.",
        )

    return equipment_usage_response(usage)