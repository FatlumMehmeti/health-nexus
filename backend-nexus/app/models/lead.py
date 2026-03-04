import enum
from sqlalchemy import String, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class LeadStatus(str, enum.Enum):
    NEW = "NEW"
    CONTACTED = "CONTACTED"
    DEMO_SCHEDULED = "DEMO_SCHEDULED"
    DEMO_COMPLETED = "DEMO_COMPLETED"
    HIGH_INTEREST = "HIGH_INTEREST"
    NEGOTIATION = "NEGOTIATION"
    CONVERTED = "CONVERTED"
    REJECTED = "REJECTED"


class Lead(Base, TimestampMixin):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(primary_key=True)

    organization_name: Mapped[str | None] = mapped_column(String(255))
    contact_name: Mapped[str | None] = mapped_column(String(255))
    contact_email: Mapped[str | None] = mapped_column(String(255))
    contact_phone: Mapped[str | None] = mapped_column(String(50))
    source: Mapped[str | None] = mapped_column(String(100))

    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status"), default=LeadStatus.NEW, nullable=False
    )

    assigned_sales_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id"), nullable=True
    )

    notes: Mapped[str | None] = mapped_column(Text)

    status_history = relationship(
        "LeadStatusHistory", back_populates="lead", cascade="all, delete-orphan"
    )

    consultation_bookings = relationship(
        "ConsultationBooking", back_populates="lead", cascade="all, delete-orphan"
    )
