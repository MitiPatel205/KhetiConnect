from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.models.crop import Crop
from app.models.equipment import Equipment
from app.models.farm import Farm
from app.models.field import Field
from app.models.inventory import InventoryItem
from app.models.task import Task

router = APIRouter(
    prefix="/dashboard",
    tags=["Dashboard"]
)


@router.get("/summary")
def get_dashboard_summary(
    farm_id: int = Query(gt=0),
    db: Session = Depends(get_db)
):
    farm = db.get(Farm, farm_id)

    if farm is None:
        raise HTTPException(
            status_code=404,
            detail="Farm not found."
        )

    today = date.today()

    total_fields = db.query(Field).filter(
        Field.farm_id == farm_id
    ).count()

    active_crops = db.query(Crop).join(Field).filter(
        Field.farm_id == farm_id,
        Crop.status.in_(["Planted", "Growing"])
    ).count()

    open_tasks = db.query(Task).filter(
        Task.farm_id == farm_id,
        Task.status != "Completed"
    ).count()

    overdue_tasks = db.query(Task).filter(
        Task.farm_id == farm_id,
        Task.status != "Completed",
        Task.due_date.is_not(None),
        Task.due_date < today
    ).count()

    completed_tasks = db.query(Task).filter(
        Task.farm_id == farm_id,
        Task.status == "Completed"
    ).count()

    low_stock_items = db.query(InventoryItem).filter(
        InventoryItem.farm_id == farm_id,
        InventoryItem.quantity <= InventoryItem.reorder_level
    ).count()

    maintenance_due = db.query(Equipment).filter(
        Equipment.farm_id == farm_id,
        Equipment.next_service_date.is_not(None),
        Equipment.next_service_date <= today
    ).count()

    upcoming_tasks = db.query(Task).filter(
        Task.farm_id == farm_id,
        Task.status != "Completed",
        Task.due_date.is_not(None),
        Task.due_date >= today
    ).order_by(Task.due_date.asc()).limit(5).all()

    return {
        "farm": {
            "id": farm.id,
            "name": farm.name,
            "location": farm.location
        },
        "summary": {
            "total_fields": total_fields,
            "active_crops": active_crops,
            "open_tasks": open_tasks,
            "overdue_tasks": overdue_tasks,
            "completed_tasks": completed_tasks,
            "low_stock_items": low_stock_items,
            "maintenance_due": maintenance_due
        },
        "upcoming_tasks": [
            {
                "id": task.id,
                "title": task.title,
                "due_date": task.due_date,
                "priority": task.priority,
                "status": task.status
            }
            for task in upcoming_tasks
        ]
    }