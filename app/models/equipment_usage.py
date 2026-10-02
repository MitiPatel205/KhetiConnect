from datetime import datetime

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class EquipmentUsageLog(Base):
    __tablename__ = "equipment_usage_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    equipment_id: Mapped[int] = mapped_column(
        ForeignKey("equipment.id"),
        nullable=False,
        index=True,
    )

    worker_id: Mapped[int] = mapped_column(
        ForeignKey("workers.id"),
        nullable=False,
        index=True,
    )

    field_id: Mapped[int | None] = mapped_column(
        ForeignKey("fields.id"),
        nullable=True,
        index=True,
    )

    purpose: Mapped[str] = mapped_column(String(250), nullable=False)

    location: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    checked_out_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    expected_return_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
    )

    checked_in_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
        index=True,
    )

    condition_out: Mapped[str] = mapped_column(
        String(50),
        default="Good",
        nullable=False,
    )

    condition_in: Mapped[str | None] = mapped_column(
        String(50),
        nullable=True,
    )

    return_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    issue_reported: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    equipment = relationship(
        "Equipment",
        back_populates="usage_logs",
    )

    worker = relationship(
        "Worker",
        back_populates="equipment_usage_logs",
    )

    field = relationship(
        "Field",
        back_populates="equipment_usage_logs",
    )