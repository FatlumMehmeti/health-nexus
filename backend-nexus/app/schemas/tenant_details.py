from pydantic import BaseModel
from typing import Optional
from datetime import datetime

from app.models.tenant_details import FontKey


class TenantDetailsBase(BaseModel):
    logo: Optional[str] = None
    moto: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    brand_color_background: Optional[str] = None
    brand_color_foreground: Optional[str] = None
    brand_color_muted: Optional[str] = None
    title: Optional[str] = None
    slogan: Optional[str] = None
    about_text: Optional[str] = None
    font_key: Optional[FontKey] = None


class TenantDetailsUpdate(BaseModel):
    """All optional for partial updates."""
    logo: Optional[str] = None
    image: Optional[str] = None
    moto: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    brand_color_background: Optional[str] = None
    brand_color_foreground: Optional[str] = None
    brand_color_muted: Optional[str] = None
    font_id: Optional[int] = None
    title: Optional[str] = None
    slogan: Optional[str] = None
    about_text: Optional[str] = None
    font_key: Optional[FontKey] = None


class TenantDetailsRead(TenantDetailsBase):
    tenant_id: int
    font_id: Optional[int] = None
    font_key: Optional[str] = None  # legacy
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True
