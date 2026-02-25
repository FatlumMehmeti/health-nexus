from pydantic import BaseModel
from datetime import datetime
from typing import Optional


class ProductTemplateRead(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    default_price: float
    sort_order: int
    created_at: datetime

    class Config:
        from_attributes = True


class BulkProductsRequest(BaseModel):
    """Bulk set products for a tenant. Replaces existing with products created from these templates."""
    product_template_ids: list[int]
