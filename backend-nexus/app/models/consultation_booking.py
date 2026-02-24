import enum
from sqlalchemy import ForeignKey, Integer, Text, TIMESTAMP
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.dialects.postgresql import ENUM

from .base import Base, TimestampMixin


class ConsultationStatus(enum.Enum):
    SCHEDULED = "SCHEDULED"
    COMPLETED = "COMPLETED"
    CANCELLED = "CANCELLED"
    NO_SHOW = "NO_SHOW"


class ConsultationBooking(Base, TimestampMixin):
    __tablename__ = "consultation_bookings"

    id: Mapped[int] = mapped_column(primary_key=True)

    lead_id: Mapped[int] = mapped_column(
        ForeignKey("leads.id"),
        nullable=False
    )

    scheduled_at = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    duration_minutes: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True
    )

    meeting_link: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    location: Mapped[str | None] = mapped_column(
        Text,
        nullable=True
    )

    status: Mapped[ConsultationStatus] = mapped_column(
        ENUM(
            ConsultationStatus,
            name="consultation_status",
            create_type=True
        ),
        server_default="SCHEDULED",
        nullable=False
    )

    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"),
        nullable=True
    )

    completed_at = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    cancelled_at = mapped_column(
        TIMESTAMP(timezone=True),
        nullable=True
    )

    created_at = mapped_column(
        TIMESTAMP(timezone=True),
        server_default=func.now()
    )

    # Relationships
    lead = relationship("Lead", back_populates="consultation_bookings")
    creator = relationship("User")