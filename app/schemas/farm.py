from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FarmBase(BaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
        examples=["Green Valley Farm"]
    )
    location: str | None = Field(
        default=None,
        max_length=255,
        examples=["New Jersey"]
    )
    size_acres: float | None = Field(
        default=None,
        gt=0,
        examples=[25.5]
    )
    notes: str | None = Field(
        default=None,
        max_length=1000,
        examples=["Vegetable farm focused on seasonal crops."]
    )


class FarmCreate(FarmBase):
    pass


class FarmUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    location: str | None = Field(default=None, max_length=255)
    size_acres: float | None = Field(default=None, gt=0)
    notes: str | None = Field(default=None, max_length=1000)


class FarmResponse(FarmBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)