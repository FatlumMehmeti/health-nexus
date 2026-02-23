import enum
from datetime import datetime
from sqlalchemy import String, Enum, DateTime, ForeignKey, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

# Enum for consultation request workflow states
class ConsultationStatus(enum.Enum):
    pending = "pending"
    scheduled = "scheduled"
    completed = "completed"
    rejected = "rejected"


class ConsultationRequest(Base, TimestampMixin):
    __tablename__ = "consultation_requests"

    id: Mapped[int] = mapped_column(primary_key=True)

    tenant_name: Mapped[str] = mapped_column(String(255), nullable=False)
    contact_email: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # DB server time
    date_of_request: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    # The date the tenant prefers for the consulation (Optional)
    preferred_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    status: Mapped[ConsultationStatus] = mapped_column(
        Enum(ConsultationStatus), default=ConsultationStatus.pending, nullable=False
    )

    sales_agent_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True)

    sales_agent = relationship("User")