from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.crop import Crop
from app.models.field import Field
from app.schemas.crop import CropCreate, CropResponse, CropUpdate

router = APIRouter(
    prefix="/crops",
    tags=["Crops"]
)


@router.post(
    "",
    response_model=CropResponse,
    status_code=status.HTTP_201_CREATED
)
def create_crop(
    crop_data: CropCreate,
    db: Session = Depends(get_db)
):
    field = db.get(Field, crop_data.field_id)

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found."
        )

    crop = Crop(**crop_data.model_dump())
    db.add(crop)
    db.commit()
    db.refresh(crop)
    return crop


@router.get(
    "",
    response_model=list[CropResponse]
)
def list_crops(
    field_id: int | None = Query(default=None, gt=0),
    status_filter: str | None = Query(default=None, alias="status"),
    db: Session = Depends(get_db)
):
    query = db.query(Crop)

    if field_id is not None:
        query = query.filter(Crop.field_id == field_id)

    if status_filter is not None:
        query = query.filter(Crop.status == status_filter)

    return query.order_by(Crop.created_at.desc()).all()


@router.get(
    "/{crop_id}",
    response_model=CropResponse
)
def get_crop(
    crop_id: int,
    db: Session = Depends(get_db)
):
    crop = db.get(Crop, crop_id)

    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop not found."
        )

    return crop


@router.put(
    "/{crop_id}",
    response_model=CropResponse
)
def update_crop(
    crop_id: int,
    crop_data: CropUpdate,
    db: Session = Depends(get_db)
):
    crop = db.get(Crop, crop_id)

    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop not found."
        )

    for field_name, value in crop_data.model_dump(exclude_unset=True).items():
        setattr(crop, field_name, value)

    db.commit()
    db.refresh(crop)
    return crop


@router.delete(
    "/{crop_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_crop(
    crop_id: int,
    db: Session = Depends(get_db)
):
    crop = db.get(Crop, crop_id)

    if crop is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Crop not found."
        )

    db.delete(crop)
    db.commit()