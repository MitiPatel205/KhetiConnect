from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, field_validator


VALID_PRIORITIES = {"Low", "Medium", "High", "Urgent"}
VALID_STATUSES = {"To Do", "In Progress", "Completed"}


class TaskBase(BaseModel):
    farm_id: int = Field(gt=0, examples=[1])

    field_id: int | None = Field(default=None, gt=0, examples=[1])
    crop_id: int | None = Field(default=None, gt=0, examples=[1])
    worker_id: int | None = Field(default=None, gt=0, examples=[1])

    title: str = Field(
        min_length=2,
        max_length=200,
        examples=["Water tomato plants"]
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Check drip irrigation in the North Field."]
    )

    due_date: date | None = Field(
        default=None,
        examples=["2026-09-15"]
    )

    priority: str = Field(default="Medium", examples=["High"])
    status: str = Field(default="To Do", examples=["To Do"])

    notes: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Check soil moisture before watering."]
    )

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str) -> str:
        if value not in VALID_PRIORITIES:
            raise ValueError(
                "Priority must be Low, Medium, High, or Urgent."
            )
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str) -> str:
        if value not in VALID_STATUSES:
            raise ValueError(
                "Status must be To Do, In Progress, or Completed."
            )
        return value


class TaskCreate(TaskBase):
    pass


class TaskUpdate(BaseModel):
    field_id: int | None = Field(default=None, gt=0)
    crop_id: int | None = Field(default=None, gt=0)
    worker_id: int | None = Field(default=None, gt=0)
    title: str | None = Field(default=None, min_length=2, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    due_date: date | None = None
    priority: str | None = None
    status: str | None = None
    notes: str | None = Field(default=None, max_length=2000)

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_PRIORITIES:
            raise ValueError(
                "Priority must be Low, Medium, High, or Urgent."
            )
        return value

    @field_validator("status")
    @classmethod
    def validate_status(cls, value: str | None) -> str | None:
        if value is not None and value not in VALID_STATUSES:
            raise ValueError(
                "Status must be To Do, In Progress, or Completed."
            )
        return value


class TaskResponse(TaskBase):
    id: int
    completed_at: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)