from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class EquipmentUsageCheckout(BaseModel):
    equipment_id: int = Field(gt=0)
    worker_id: int = Field(gt=0)
    field_id: int | None = Field(default=None, gt=0)

    purpose: str = Field(min_length=2, max_length=250)
    location: str | None = Field(default=None, max_length=150)

    expected_return_at: datetime | None = None
    condition_out: str = Field(
        default="Good",
        min_length=2,
        max_length=50,
    )


class EquipmentUsageReturn(BaseModel):
    condition_in: str = Field(min_length=2, max_length=50)
    return_notes: str | None = Field(
        default=None,
        max_length=2000,
    )
    issue_reported: bool = False


class EquipmentUsageResponse(BaseModel):
    id: int

    equipment_id: int
    equipment_name: str
    equipment_category: str

    worker_id: int
    worker_name: str

    field_id: int | None
    field_name: str | None

    purpose: str
    location: str | None

    checked_out_at: datetime
    expected_return_at: datetime | None
    checked_in_at: datetime | None

    condition_out: str
    condition_in: str | None

    return_notes: str | None
    issue_reported: bool

    is_active: bool
    is_overdue: bool

    created_at: datetime

    model_config = ConfigDict(from_attributes=True)