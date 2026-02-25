"""Global product catalog (templates) that tenants can enable."""

from sqlalchemy import String, Integer, Text, DECIMAL
from sqlalchemy.orm import Mapped, mapped_column

from .base import Base, TimestampMixin


class ProductTemplate(Base, TimestampMixin):
    __tablename__ = "product_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    default_price: Mapped[float] = mapped_column(DECIMAL, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
