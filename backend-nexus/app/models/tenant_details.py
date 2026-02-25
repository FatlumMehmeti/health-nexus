import enum
from sqlalchemy import String, Enum, ForeignKey, Integer
from sqlalchemy.orm import Mapped, mapped_column, relationship
from .base import Base, TimestampMixin


class FontKey(enum.Enum):
    """Legacy enum; prefer font_id FK to fonts table."""
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
    brand_color_primary: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex
    brand_color_secondary: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex
    brand_color_background: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex
    brand_color_foreground: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex (text)
    brand_color_muted: Mapped[str] = mapped_column(String(7), nullable=True)  # Hex (borders, subtle)

    # Content fields
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    slogan: Mapped[str] = mapped_column(String(255), nullable=True)
    about_text: Mapped[str] = mapped_column(String(1000), nullable=True)
    
    # Font selection (font_id preferred; font_key legacy)
    font_id: Mapped[int | None] = mapped_column(Integer, ForeignKey("fonts.id"), nullable=True)
    font_key: Mapped[FontKey | None] = mapped_column(Enum(FontKey), nullable=True)

    tenant = relationship("Tenant", back_populates="details")
    font = relationship("Font")
