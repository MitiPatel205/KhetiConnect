from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class CropBase(BaseModel):
    field_id: int = Field(gt=0, examples=[1])

    name: str = Field(
        min_length=2,
        max_length=120,
        examples=["Tomato"]
    )

    variety: str | None = Field(
        default=None,
        max_length=120,
        examples=["Roma"]
    )

    planting_date: date | None = Field(
        default=None,
        examples=["2026-04-15"]
    )

    expected_harvest_date: date | None = Field(
        default=None,
        examples=["2026-07-20"]
    )

    growth_stage: str = Field(
        default="Planned",
        max_length=50,
        examples=["Vegetative"]
    )

    status: str = Field(
        default="Planned",
        max_length=50,
        examples=["Growing"]
    )

    notes: str | None = Field(
        default=None,
        max_length=1000,
        examples=["Monitor irrigation twice each week."]
    )

    @model_validator(mode="after")
    def validate_harvest_date(self):
        if (
            self.planting_date
            and self.expected_harvest_date
            and self.expected_harvest_date < self.planting_date
        ):
            raise ValueError(
                "Expected harvest date cannot be before planting date."
            )
        return self


class CropCreate(CropBase):
    pass


class CropUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=2, max_length=120)
    variety: str | None = Field(default=None, max_length=120)
    planting_date: date | None = None
    expected_harvest_date: date | None = None
    growth_stage: str | None = Field(default=None, max_length=50)
    status: str | None = Field(default=None, max_length=50)
    notes: str | None = Field(default=None, max_length=1000)


class CropResponse(CropBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)