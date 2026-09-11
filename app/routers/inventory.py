from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.farm import Farm
from app.models.inventory import InventoryItem
from app.schemas.inventory import (
    InventoryCreate,
    InventoryResponse,
    InventoryUpdate,
)

router = APIRouter(
    prefix="/inventory",
    tags=["Inventory"]
)


def inventory_response(item: InventoryItem) -> dict:
    return {
        "id": item.id,
        "farm_id": item.farm_id,
        "name": item.name,
        "category": item.category,
        "quantity": item.quantity,
        "unit": item.unit,
        "reorder_level": item.reorder_level,
        "supplier": item.supplier,
        "expiry_date": item.expiry_date,
        "notes": item.notes,
        "is_low_stock": item.quantity <= item.reorder_level,
        "created_at": item.created_at,
        "updated_at": item.updated_at,
    }


@router.post(
    "",
    response_model=InventoryResponse,
    status_code=status.HTTP_201_CREATED
)
def create_inventory_item(
    item_data: InventoryCreate,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, item_data.farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    item = InventoryItem(**item_data.model_dump())
    db.add(item)
    db.commit()
    db.refresh(item)
    return inventory_response(item)


@router.get(
    "/low-stock",
    response_model=list[InventoryResponse]
)
def list_low_stock_items(
    farm_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db)
):
    query = db.query(InventoryItem).filter(
        InventoryItem.quantity <= InventoryItem.reorder_level
    )

    if farm_id is not None:
        query = query.filter(InventoryItem.farm_id == farm_id)

    items = query.order_by(InventoryItem.quantity.asc()).all()
    return [inventory_response(item) for item in items]


@router.get(
    "",
    response_model=list[InventoryResponse]
)
def list_inventory_items(
    farm_id: int | None = Query(default=None, gt=0),
    category: str | None = Query(default=None),
    db: Session = Depends(get_db)
):
    query = db.query(InventoryItem)

    if farm_id is not None:
        query = query.filter(InventoryItem.farm_id == farm_id)

    if category is not None:
        query = query.filter(InventoryItem.category == category)

    items = query.order_by(InventoryItem.name.asc()).all()
    return [inventory_response(item) for item in items]


@router.get(
    "/{item_id}",
    response_model=InventoryResponse
)
def get_inventory_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    item = db.get(InventoryItem, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found."
        )

    return inventory_response(item)


@router.put(
    "/{item_id}",
    response_model=InventoryResponse
)
def update_inventory_item(
    item_id: int,
    item_data: InventoryUpdate,
    db: Session = Depends(get_db)
):
    item = db.get(InventoryItem, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found."
        )

    for field_name, value in item_data.model_dump(exclude_unset=True).items():
        setattr(item, field_name, value)

    db.commit()
    db.refresh(item)
    return inventory_response(item)


@router.delete(
    "/{item_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_inventory_item(
    item_id: int,
    db: Session = Depends(get_db)
):
    item = db.get(InventoryItem, item_id)

    if item is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Inventory item not found."
        )

    db.delete(item)
    db.commit()