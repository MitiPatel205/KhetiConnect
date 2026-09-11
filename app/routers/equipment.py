from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.equipment import Equipment
from app.models.farm import Farm
from app.schemas.equipment import (
    EquipmentCreate,
    EquipmentResponse,
    EquipmentUpdate,
)

router = APIRouter(
    prefix="/equipment",
    tags=["Equipment"]
)


def equipment_response(item: Equipment) -> dict:
    return {
        "id": item.id,
        "farm_id": item.farm_id,
        "name": item.name,
        "category": item.category,
        "asset_tag": item.asset_tag,
        "condition": item.condition,
        "purchase_date": item.purchase_date,
        "last_service_date": item.last_service_date,
        "next_service_date": item.next_service_date,
        "notes": item.notes,
        "is_maintenance_due": (
            item.next_service_date is not None
            and item.next_service_date <= date.today()
        ),
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.post(
    "",
    response_model=EquipmentResponse,
    status_code=status.HTTP_201_CREATED
)
def create_equipment(
    equipment_data: EquipmentCreate,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, equipment_data.farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    item = Equipment(**equipment_data.model_dump())
    db.add(item)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset tag must be unique."
        )

    db.refresh(item)
    return equipment_response(item)


@router.get(
    "/maintenance-due",
    response_model=list[EquipmentResponse]
)
def list_maintenance_due(
    farm_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db)
):
    query = db.query(Equipment).filter(
        Equipment.next_service_date.is_not(None),
        Equipment.next_service_date <= date.today()
    )

    if farm_id is not None:
        query = query.filter(Equipment.farm_id == farm_id)

    items = query.order_by(Equipment.next_service_date.asc()).all()
    return [equipment_response(item) for item in items]


@router.get(
    "",
    response_model=list[EquipmentResponse]
)
def list_equipment(
    farm_id: int | None = Query(default=None, gt=0),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(Equipment)

    if farm_id is not None:
        query = query.filter(Equipment.farm_id == farm_id)

    if category is not None:
        query = query.filter(Equipment.category == category)

    items = query.order_by(Equipment.name.asc()).all()
    return [equipment_response(item) for item in items]


@router.get(
    "/{equipment_id}",
    response_model=EquipmentResponse
)
def get_equipment(
    equipment_id: int,
    db: Session = Depends(get_db)
):
    item = db.get(Equipment, equipment_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found."
        )

    return equipment_response(item)


@router.put(
    "/{equipment_id}",
    response_model=EquipmentResponse
)
def update_equipment(
    equipment_id: int,
    equipment_data: EquipmentUpdate,
    db: Session = Depends(get_db)
):
    item = db.get(Equipment, equipment_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found."
        )

    for field_name, value in equipment_data.model_dump(
        exclude_unset=True
    ).items():
        setattr(item, field_name, value)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Asset tag must be unique."
        )

    db.refresh(item)
    return equipment_response(item)


@router.delete(
    "/{equipment_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_equipment(
    equipment_id: int,
    db: Session = Depends(get_db)
):
    item = db.get(Equipment, equipment_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Equipment not found."
        )

    db.delete(item)
    db.commit()