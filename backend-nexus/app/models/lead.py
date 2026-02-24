import enum

from sqlalchemy import String, Text, ForeignKey, Enum
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

    company_name: Mapped[str] = mapped_column(String(255))
    contact_name: Mapped[str | None] = mapped_column(String(255))
    email: Mapped[str | None] = mapped_column(String(255))
    phone: Mapped[str | None] = mapped_column(String(50))

    status: Mapped[LeadStatus] = mapped_column(
        Enum(LeadStatus, name="lead_status"),
        default=LeadStatus.NEW,
        nullable=False
    )

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False
    )

    notes: Mapped[str | None] = mapped_column(Text)

    tenant = relationship("Tenant", back_populates="leads")

    status_history = relationship(
        "LeadStatusHistory",
        back_populates="lead",
        cascade="all, delete-orphan"
    )
    
    consultation_bookings = relationship(
        "ConsultationBooking",
        back_populates="lead",
        cascade="all, delete-orphan"
    )