from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id"),
        nullable=False,
        index=True
    )

    field_id: Mapped[int | None] = mapped_column(
        ForeignKey("fields.id"),
        nullable=True,
        index=True
    )

    crop_id: Mapped[int | None] = mapped_column(
        ForeignKey("crops.id"),
        nullable=True,
        index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    due_date: Mapped[date | None] = mapped_column(Date, nullable=True)

    priority: Mapped[str] = mapped_column(
        String(20),
        default="Medium",
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(30),
        default="To Do",
        nullable=False
    )

    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    farm = relationship("Farm")
    field = relationship("Field")
    crop = relationship("Crop")