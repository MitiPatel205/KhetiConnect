from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Crop(Base):
    __tablename__ = "crops"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    field_id: Mapped[int] = mapped_column(
        ForeignKey("fields.id"),
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(String(120), nullable=False)
    variety: Mapped[str | None] = mapped_column(String(120), nullable=True)

    planting_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    expected_harvest_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )

    growth_stage: Mapped[str] = mapped_column(
        String(50),
        default="Planned",
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        default="Planned",
        nullable=False
    )

    notes: Mapped[str | None] = mapped_column(String(1000), nullable=True)

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

    field = relationship("Field", back_populates="crops")