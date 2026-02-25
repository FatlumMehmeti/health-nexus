"""Brand themes for tenant branding (color palette dropdown). No auth required."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.brand_theme import BrandTheme
from app.schemas.brand_theme import BrandThemeRead

router = APIRouter(prefix="/brands", tags=["Brands"])


@router.get("", response_model=list[BrandThemeRead])
def list_brands(db: Session = Depends(get_db)):
    """List brand themes for tenant branding dropdown."""
    return db.query(BrandTheme).order_by(BrandTheme.sort_order, BrandTheme.name).all()
