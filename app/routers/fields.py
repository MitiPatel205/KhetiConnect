from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.farm import Farm
from app.models.field import Field
from app.schemas.field import FieldCreate, FieldResponse, FieldUpdate

router = APIRouter(
    prefix="/fields",
    tags=["Fields"]
)


@router.post(
    "",
    response_model=FieldResponse,
    status_code=status.HTTP_201_CREATED
)
def create_field(
    field_data: FieldCreate,
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, field_data.farm_id)

    if farm is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Farm not found."
        )

    field = Field(**field_data.model_dump())
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.get(
    "",
    response_model=list[FieldResponse]
)
def list_fields(
    farm_id: int | None = Query(default=None, gt=0),
    db: Session = Depends(get_db)
):
    query = db.query(Field)

    if farm_id is not None:
        query = query.filter(Field.farm_id == farm_id)

    return query.order_by(Field.created_at.desc()).all()


@router.get(
    "/{field_id}",
    response_model=FieldResponse
)
def get_field(
    field_id: int,
    db: Session = Depends(get_db)
):
    field = db.get(Field, field_id)

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found."
        )

    return field


@router.put(
    "/{field_id}",
    response_model=FieldResponse
)
def update_field(
    field_id: int,
    field_data: FieldUpdate,
    db: Session = Depends(get_db)
):
    field = db.get(Field, field_id)

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found."
        )

    for field_name, value in field_data.model_dump(exclude_unset=True).items():
        setattr(field, field_name, value)

    db.commit()
    db.refresh(field)
    return field


@router.delete(
    "/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def delete_field(
    field_id: int,
    db: Session = Depends(get_db)
):
    field = db.get(Field, field_id)

    if field is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Field not found."
        )

    db.delete(field)
    db.commit()