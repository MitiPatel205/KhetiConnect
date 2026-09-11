from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class MaintenanceLogBase(BaseModel):
    equipment_id: int = Field(gt=0, examples=[1])

    service_date: date = Field(examples=["2026-07-15"])

    description: str = Field(
        min_length=2,
        max_length=500,
        examples=["Oil change and filter replacement"]
    )

    cost: float | None = Field(
        default=None,
        ge=0,
        examples=[180.00]
    )

    provider: str | None = Field(
        default=None,
        max_length=150,
        examples=["Farm Equipment Service LLC"]
    )

    notes: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Next service due in three months."]
    )


class MaintenanceLogCreate(MaintenanceLogBase):
    pass


class MaintenanceLogResponse(MaintenanceLogBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)