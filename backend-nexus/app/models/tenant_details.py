import enum
from sqlalchemy import String, Enum, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class FontKey(enum.Enum):
    f1 = "f1"
    f2 = "f2"
    f3 = "f3"
    f4 = "f4"
    f5 = "f5"


class TenantDetails(Base, TimestampMixin):
    __tablename__ = "tenant_details"

    tenant_id: Mapped[int] = mapped_column(ForeignKey("tenants.id"), primary_key=True)

    # Branding fields
    logo: Mapped[str] = mapped_column(String(255), nullable=True)
    image: Mapped[str] = mapped_column(String(255), nullable=True)  # hero/cover image for public listing
    moto: Mapped[str] = mapped_column(String(255), nullable=True)
    brand_color_primary: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex color
    brand_color_secondary: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex color
    
    # Content fields
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    slogan: Mapped[str] = mapped_column(String(255), nullable=True)
    about_text: Mapped[str] = mapped_column(String(1000), nullable=True)
    
    # Font selection
    font_key: Mapped[FontKey] = mapped_column(Enum(FontKey), nullable=True)

    tenant = relationship("Tenant", back_populates="details")
