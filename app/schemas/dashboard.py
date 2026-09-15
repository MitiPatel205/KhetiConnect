from datetime import date

from pydantic import BaseModel, Field


class DashboardFarmResponse(BaseModel):
    id: int
    name: str
    location: str | None = None


class DashboardSummaryResponse(BaseModel):
    total_fields: int = Field(ge=0)
    active_crops: int = Field(ge=0)
    open_tasks: int = Field(ge=0)
    active_workers: int = Field(ge=0)
    unassigned_open_tasks: int = Field(ge=0)
    overdue_tasks: int = Field(ge=0)
    completed_tasks: int = Field(ge=0)
    low_stock_items: int = Field(ge=0)
    maintenance_due: int = Field(ge=0)


class UpcomingTaskResponse(BaseModel):
    id: int
    title: str
    due_date: date
    priority: str
    status: str


class DashboardResponse(BaseModel):
    farm: DashboardFarmResponse
    summary: DashboardSummaryResponse
    upcoming_tasks: list[UpcomingTaskResponse]