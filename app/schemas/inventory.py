from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class InventoryBase(BaseModel):
    farm_id: int = Field(gt=0, examples=[1])

    name: str = Field(
        min_length=2,
        max_length=150,
        examples=["Tomato Seeds"]
    )

    category: str = Field(
        min_length=2,
        max_length=80,
        examples=["Seeds"]
    )

    quantity: float = Field(
        ge=0,
        examples=[4]
    )

    unit: str = Field(
        min_length=1,
        max_length=40,
        examples=["packets"]
    )

    reorder_level: float = Field(
        ge=0,
        examples=[5]
    )

    supplier: str | None = Field(
        default=None,
        max_length=150,
        examples=["Local Seed Co."]
    )

    expiry_date: date | None = Field(
        default=None,
        examples=["2027-01-30"]
    )

    notes: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Store in a cool, dry place."]
    )


class InventoryCreate(InventoryBase):
    pass


class InventoryUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    quantity: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, min_length=1, max_length=40)
    reorder_level: float | None = Field(default=None, ge=0)
    supplier: str | None = Field(default=None, max_length=150)
    expiry_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class InventoryResponse(InventoryBase):
    id: int
    is_low_stock: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)