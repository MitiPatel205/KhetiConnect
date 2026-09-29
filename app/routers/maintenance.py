from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session, joinedload

from app.db.database import get_db
from app.models.equipment import Equipment
from app.models.inventory import InventoryItem
from app.models.maintenance import MaintenanceLog
from app.models.maintenance_inventory_usage import MaintenanceInventoryUsage
from app.schemas.maintenance import (
    MaintenanceLogCreate,
    MaintenanceLogResponse,
    MaintenanceLogUpdate,
)

router = APIRouter(
    prefix="/maintenance-logs",
    tags=["Maintenance Logs"],
)


def maintenance_part_usage_response(
    usage: MaintenanceInventoryUsage,
) -> dict:
    return {
        "id": usage.id,
        "inventory_item_id": usage.inventory_item_id,
        "inventory_item_name": usage.inventory_item.name,
        "unit": usage.inventory_item.unit,
        "quantity_used": usage.quantity_used,
        "created_at": usage.created_at,
    }


def maintenance_log_response(log: MaintenanceLog) -> dict:
    return {
        "id": log.id,
        "equipment_id": log.equipment_id,
        "service_date": log.service_date,
        "description": log.description,
        "cost": log.cost,
        "provider": log.provider,
        "notes": log.notes,
        "created_at": log.created_at,
        "parts_used": [
            maintenance_part_usage_response(usage)
            for usage in log.parts_used
        ],
    }


def get_maintenance_log_with_parts(
    log_id: int,
    db: Session,
) -> MaintenanceLog | None:
    return (
        db.query(MaintenanceLog)
        .options(
            joinedload(MaintenanceLog.parts_used).joinedload(
                MaintenanceInventoryUsage.inventory_item,
            ),
        )
        .filter(MaintenanceLog.id == log_id)
        .first()
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

    part_ids = [part.inventory_item_id for part in log_data.parts_used]

    if len(part_ids) != len(set(part_ids)):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Each inventory item can be used only once per maintenance log.",
        )

    inventory_items: dict[int, InventoryItem] = {}

    if part_ids:
        queried_items = (
            db.query(InventoryItem)
            .filter(InventoryItem.id.in_(part_ids))
            .all()
        )
        inventory_items = {item.id: item for item in queried_items}

    for part in log_data.parts_used:
        item = inventory_items.get(part.inventory_item_id)

        if item is None:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Inventory item {part.inventory_item_id} not found.",
            )

        if item.farm_id != equipment.farm_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f'Inventory item "{item.name}" does not belong to the '
                    "same farm as the equipment."
                ),
            )

        if part.quantity_used > item.quantity:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f'Insufficient stock for "{item.name}". Available: '
                    f"{item.quantity} {item.unit}."
                ),
            )

    try:
        log_payload = log_data.model_dump(exclude={"parts_used"})
        log = MaintenanceLog(**log_payload)
        db.add(log)
        db.flush()

        for part in log_data.parts_used:
            item = inventory_items[part.inventory_item_id]

            item.quantity -= part.quantity_used

            usage = MaintenanceInventoryUsage(
                maintenance_log_id=log.id,
                inventory_item_id=item.id,
                quantity_used=part.quantity_used,
            )
            db.add(usage)

        db.commit()
    except Exception:
        db.rollback()
        raise

    saved_log = get_maintenance_log_with_parts(log.id, db)

    if saved_log is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Maintenance log could not be loaded after creation.",
        )

    return maintenance_log_response(saved_log)


@router.get(
    "",
    response_model=list[MaintenanceLogResponse],
)
def list_maintenance_logs(
    equipment_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db),
):
    query = db.query(MaintenanceLog).options(
        joinedload(MaintenanceLog.parts_used).joinedload(
            MaintenanceInventoryUsage.inventory_item,
        ),
    )

    if equipment_id is not None:
        query = query.filter(MaintenanceLog.equipment_id == equipment_id)

    logs = query.order_by(MaintenanceLog.service_date.desc()).all()

    return [maintenance_log_response(log) for log in logs]


@router.put(
    "/{log_id}",
    response_model=MaintenanceLogResponse,
)
def update_maintenance_log(
    log_id: int,
    log_data: MaintenanceLogUpdate,
    db: Session = Depends(get_db),
):
    log = get_maintenance_log_with_parts(log_id, db)

    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )

    for field_name, value in log_data.model_dump(
        exclude_unset=True,
    ).items():
        setattr(log, field_name, value)

    db.commit()

    saved_log = get_maintenance_log_with_parts(log_id, db)

    if saved_log is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Maintenance log could not be loaded after update.",
        )

    return maintenance_log_response(saved_log)


@router.delete(
    "/{log_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_log(
    log_id: int,
    db: Session = Depends(get_db),
):
    log = get_maintenance_log_with_parts(log_id, db)

    if log is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance log not found.",
        )

    try:
        for usage in log.parts_used:
            usage.inventory_item.quantity += usage.quantity_used

        db.delete(log)
        db.commit()
    except Exception:
        db.rollback()
        raise

    return Response(status_code=status.HTTP_204_NO_CONTENT)