"""Schemas for the tenant landing page API - single response with all data."""

from pydantic import BaseModel
from typing import Optional


class TenantPublicCard(BaseModel):
    """Minimal tenant info for public listing (active tenants only)."""
    id: int
    slug: Optional[str] = None
    name: str
    moto: Optional[str] = None
    logo: Optional[str] = None
    image: Optional[str] = None

    class Config:
        from_attributes = True


from datetime import datetime


class ServiceLandingItem(BaseModel):
    id: int
    name: str
    price: float
    description: Optional[str] = None
    is_active: bool = True

    class Config:
        from_attributes = True


class DepartmentLandingItem(BaseModel):
    id: int
    name: str
    phone_number: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    services: list[ServiceLandingItem] = []

    class Config:
        from_attributes = True


class DoctorLandingItem(BaseModel):
    user_id: int
    first_name: str
    last_name: str
    specialization: Optional[str] = None
    education: Optional[str] = None
    licence_number: Optional[str] = None
    is_active: bool = True
    working_hours: Optional[dict] = None

    class Config:
        from_attributes = True


class TenantLandingRead(BaseModel):
    id: int
    name: str
    email: str
    licence_number: str

    class Config:
        from_attributes = True


class TenantDetailsLandingRead(BaseModel):
    tenant_id: int
    logo: Optional[str] = None
    moto: Optional[str] = None
    brand_color_primary: Optional[str] = None
    brand_color_secondary: Optional[str] = None
    title: Optional[str] = None
    slogan: Optional[str] = None
    about_text: Optional[str] = None
    font_key: Optional[str] = None

    class Config:
        from_attributes = True


class TenantLandingPageResponse(BaseModel):
    tenant: TenantLandingRead
    details: Optional[TenantDetailsLandingRead] = None
    departments: list[DepartmentLandingItem] = []
    doctors: list[DoctorLandingItem] = []
