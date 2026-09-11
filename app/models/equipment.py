from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Equipment(Base):
    __tablename__ = "equipment"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    farm_id: Mapped[int] = mapped_column(
        ForeignKey("farms.id"),
        nullable=False,
        index=True
    )

    name: Mapped[str] = mapped_column(String(150), nullable=False)
    category: Mapped[str] = mapped_column(String(80), nullable=False)

    asset_tag: Mapped[str | None] = mapped_column(
        String(80),
        unique=True,
        nullable=True
    )

    condition: Mapped[str] = mapped_column(
        String(50),
        default="Good",
        nullable=False
    )

    purchase_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    last_service_date: Mapped[date | None] = mapped_column(
        Date,
        nullable=True
    )
    next_service_date: Mapped[date | None] = mapped_column(
        Date,
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

    maintenance_logs = relationship(
        "MaintenanceLog",
        back_populates="equipment",
        cascade="all, delete-orphan"
    )