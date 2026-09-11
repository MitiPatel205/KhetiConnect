from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class EquipmentBase(BaseModel):
    farm_id: int = Field(gt=0, examples=[1])

    name: str = Field(
        min_length=2,
        max_length=150,
        examples=["John Deere Tractor"]
    )

    category: str = Field(
        min_length=2,
        max_length=80,
        examples=["Tractor"]
    )

    asset_tag: str | None = Field(
        default=None,
        max_length=80,
        examples=["TR-001"]
    )

    condition: str = Field(
        default="Good",
        max_length=50,
        examples=["Good"]
    )

    purchase_date: date | None = Field(
        default=None,
        examples=["2023-05-10"]
    )

    last_service_date: date | None = Field(
        default=None,
        examples=["2026-07-15"]
    )

    next_service_date: date | None = Field(
        default=None,
        examples=["2026-10-15"]
    )

    notes: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Change oil every 200 operating hours."]
    )

    @model_validator(mode="after")
    def validate_service_dates(self):
        if (
            self.last_service_date
            and self.next_service_date
            and self.next_service_date < self.last_service_date
        ):
            raise ValueError(
                "Next service date cannot be before last service date."
            )
        return self


class EquipmentCreate(EquipmentBase):
    pass


class EquipmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=150)
    category: str | None = Field(default=None, min_length=2, max_length=80)
    asset_tag: str | None = Field(default=None, max_length=80)
    condition: str | None = Field(default=None, max_length=50)
    purchase_date: date | None = None
    last_service_date: date | None = None
    next_service_date: date | None = None
    notes: str | None = Field(default=None, max_length=2000)


class EquipmentResponse(EquipmentBase):
    id: int
    is_maintenance_due: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)