from sqlalchemy import String, Numeric, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin

class Membership(Base, TimestampMixin):
    __tablename__ = "memberships"

    id: Mapped[int] = mapped_column(primary_key=True)

    name: Mapped[str] = mapped_column(String(100), unique=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    duration: Mapped[int] = mapped_column(Integer)  # days

    subscriptions = relationship("TenantSubscription", back_populates="membership")
    requested_by_tenants = relationship("Tenant", back_populates="requested_membership")
