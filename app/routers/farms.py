from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.farm import Farm
from app.schemas.farm import FarmCreate, FarmResponse, FarmUpdate

router = APIRouter(
    prefix="/farms",
    tags=["Farms"]
)


@router.post(
    "",
    response_model=FarmResponse,
    status_code=status.HTTP_201_CREATED
)
def create_farm(
    farm_data: FarmCreate,
    db: Session = Depends(get_db)
):
    farm = Farm(**farm_data.model_dump())
    db.add(farm)
    db.commit()
    db.refresh(farm)
    return farm


@router.get(
    "",
    response_model=list[FarmResponse]
)
def list_farms(db: Session = Depends(get_db)):
    return db.query(Farm).order_by(Farm.created_at.desc()).all()


@router.get(
    "/{farm_id}",
    response_model=FarmResponse
)
def get_farm(
    farm_id: int,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    return farm


@router.put(
    "/{farm_id}",
    response_model=FarmResponse
)
def update_farm(
    farm_id: int,
    farm_data: FarmUpdate,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    for field, value in farm_data.model_dump(exclude_unset=True).items():
        setattr(farm, field, value)

    db.commit()
    db.refresh(farm)
    return farm


@router.delete(
    "/{farm_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_farm(
    farm_id: int,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    db.delete(farm)
    db.commit()