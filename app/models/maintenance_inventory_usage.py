from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class MaintenanceInventoryUsage(Base):
    __tablename__ = "maintenance_inventory_usage"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    maintenance_log_id: Mapped[int] = mapped_column(
        ForeignKey("maintenance_logs.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    inventory_item_id: Mapped[int] = mapped_column(
        ForeignKey("inventory_items.id"),
        nullable=False,
        index=True,
    )

    quantity_used: Mapped[float] = mapped_column(Float, nullable=False)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    maintenance_log = relationship(
        "MaintenanceLog",
        back_populates="parts_used",
    )

    inventory_item = relationship(
        "InventoryItem",
        back_populates="maintenance_usages",
    )