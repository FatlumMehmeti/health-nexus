"""Product templates - global catalog for tenant product selection. No auth required."""

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.product_template import ProductTemplate
from app.schemas.product_template import ProductTemplateRead

router = APIRouter(prefix="/product-templates", tags=["Product Templates"])


@router.get("", response_model=list[ProductTemplateRead])
def list_product_templates(db: Session = Depends(get_db)):
    """List product templates for tenant product dropdown."""
    return db.query(ProductTemplate).order_by(ProductTemplate.sort_order, ProductTemplate.name).all()
