from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FieldBase(BaseModel):
    farm_id: int = Field(gt=0, examples=[1])
    name: str = Field(
        min_length=2,
        max_length=120,
        examples=["North Field"]
    )
    size_acres: float | None = Field(
        default=None,
        gt=0,
        examples=[10.0]
    )
    soil_type: str | None = Field(
        default=None,
        max_length=100,
        examples=["Loamy soil"]
    )
    status: str = Field(
        default="Active",
        max_length=50,
        examples=["Active"]
    )
    notes: str | None = Field(
        default=None,
        max_length=1000,
        examples=["Best field for tomatoes and peppers."]
    )


class FieldCreate(FieldBase):
    pass


class FieldUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    size_acres: float | None = Field(default=None, gt=0)
    soil_type: str | None = Field(default=None, max_length=100)
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=1000)


class FieldResponse(FieldBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)