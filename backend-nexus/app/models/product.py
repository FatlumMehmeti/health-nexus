from sqlalchemy import String, Integer, Boolean, ForeignKey, DECIMAL
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base


class Product(Base):
    __tablename__ = "products"

    product_id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
    price: Mapped[float] = mapped_column(DECIMAL, nullable=False)
    stock_quantity: Mapped[int] = mapped_column(Integer, default=0)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)

    tenant_id: Mapped[int] = mapped_column(
        ForeignKey("tenants.id"),
        nullable=False
    )
    product_template_id: Mapped[int | None] = mapped_column(
        ForeignKey("product_templates.id"),
        nullable=True,
        index=True,
    )

    tenant = relationship("Tenant", back_populates="products")