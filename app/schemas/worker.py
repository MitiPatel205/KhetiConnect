from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class WorkerBase(BaseModel):
    farm_id: int = Field(gt=0, examples=[1])

    name: str = Field(
        min_length=2,
        max_length=120,
        examples=["Aarav Patel"]
    )

    role: str | None = Field(
        default=None,
        max_length=100,
        examples=["Farmhand"]
    )

    phone: str | None = Field(
        default=None,
        max_length=30,
        examples=["555-0100"]
    )

    email: EmailStr | None = Field(
        default=None,
        examples=["aarav@example.com"]
    )

    hire_date: date | None = Field(
        default=None,
        examples=["2026-01-15"]
    )

    is_active: bool = True

    notes: str | None = Field(
        default=None,
        max_length=2000,
        examples=["Certified to operate tractors."]
    )


class WorkerCreate(WorkerBase):
    pass


class WorkerUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    role: str | None = Field(default=None, max_length=100)
    phone: str | None = Field(default=None, max_length=30)
    email: EmailStr | None = None
    hire_date: date | None = None
    is_active: bool | None = None
    notes: str | None = Field(default=None, max_length=2000)


class WorkerResponse(WorkerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
