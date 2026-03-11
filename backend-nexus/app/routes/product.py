from typing import Any, Dict

from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user, get_current_user_optional
from app.db import get_db
from app.models import CartItem, OrderItem, Product
from app.schemas.product import (
    ProductCreate,
    ProductListResponse,
    ProductResponse,
    ProductUpdate,
)

router = APIRouter(prefix="/api/products", tags=["Products"])


def _normalize_role(user: Dict[str, Any] | None) -> str:
    return str((user or {}).get("role") or "").strip().upper()


def _require_tenant_manager(user: Dict[str, Any]) -> int:
    if _normalize_role(user) != "TENANT_MANAGER":
        raise HTTPException(status_code=403, detail="Insufficient permissions")

    tenant_id = user.get("tenant_id")
    if tenant_id is None:
        raise HTTPException(status_code=403, detail="Tenant access denied")
    try:
        return int(tenant_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=403, detail="Tenant access denied")


@router.get("", response_model=ProductListResponse)
def list_products(
    tenant_id: int = Query(..., gt=0),
    page: int = Query(1, ge=1),
    size: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    user: Dict[str, Any] | None = Depends(get_current_user_optional),
):
    del user
    query = (
        db.query(Product)
        .filter(Product.tenant_id == tenant_id, Product.is_available.is_(True))
        .order_by(Product.name.asc(), Product.product_id.asc())
    )
    total = query.count()
    items = query.offset((page - 1) * size).limit(size).all()
    return ProductListResponse(items=items, total=total)


@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    manager_tenant_id = _require_tenant_manager(user)
    if manager_tenant_id != payload.tenant_id:
        raise HTTPException(status_code=403, detail="Tenant access denied")

    product = Product(
        name=payload.name.strip(),
        description=payload.description,
        price=payload.price,
        stock_quantity=payload.stock_quantity,
        is_available=payload.is_available,
        tenant_id=payload.tenant_id,
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product


@router.get("/{product_id}", response_model=ProductResponse)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    del user
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    payload: ProductUpdate,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    manager_tenant_id = _require_tenant_manager(user)
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.tenant_id != manager_tenant_id:
        raise HTTPException(status_code=403, detail="Tenant access denied")

    updates = payload.model_dump(exclude_unset=True)
    for field, value in updates.items():
        if field == "name" and isinstance(value, str):
            value = value.strip()
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    return product


@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    user: Dict[str, Any] = Depends(get_current_user),
):
    manager_tenant_id = _require_tenant_manager(user)
    product = db.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.tenant_id != manager_tenant_id:
        raise HTTPException(status_code=403, detail="Tenant access denied")

    has_order_items = (
        db.query(OrderItem.id).filter(OrderItem.product_id == product_id).first() is not None
    )
    has_cart_items = (
        db.query(CartItem.id).filter(CartItem.product_id == product_id).first() is not None
    )

    if has_order_items or has_cart_items:
        product.is_available = False
        db.commit()
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    try:
        db.delete(product)
        db.commit()
    except IntegrityError:
        db.rollback()
        product.is_available = False
        db.add(product)
        db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
