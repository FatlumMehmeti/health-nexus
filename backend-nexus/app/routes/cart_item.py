from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.cart_item import CartItem
from app.models.cart import Cart, CartStatus
from app.models.product import Product
from app.schemas.cart_item import CartItemCreate, CartItemRead

router = APIRouter(
    prefix="/cart-items",
    tags=["Cart Items"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Add item to cart
@router.post("/", response_model=CartItemRead)
def add_to_cart(item: CartItemCreate, db: Session = Depends(get_db)):

    cart = db.query(Cart).filter(Cart.id == item.cart_id).first()
    if not cart:
        raise HTTPException(404, "Cart not found")

    if cart.status != CartStatus.ACTIVE:
        raise HTTPException(400, "Cannot modify non-active cart")

    product = db.query(Product).filter(
        Product.product_id == item.product_id
    ).first()

    if not product:
        raise HTTPException(404, "Product not found")

    if not product.is_available:
        raise HTTPException(400, "Product not available")

    if product.stock_quantity < item.quantity:
        raise HTTPException(400, "Not enough stock")

    if product.tenant_id != cart.tenant_id:
        raise HTTPException(400, "Product does not belong to this tenant")
    
    # Check if item already exists → increase quantity
    existing_item = db.query(CartItem).filter(
        CartItem.cart_id == item.cart_id,
        CartItem.product_id == item.product_id
    ).first()

    if existing_item:
        existing_item.quantity += item.quantity
        db.commit()
        db.refresh(existing_item)
        return existing_item

    db_item = CartItem(**item.model_dump())

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


# Get items for a cart
@router.get("/cart/{cart_id}", response_model=List[CartItemRead])
def get_cart_items(cart_id: int, db: Session = Depends(get_db)):
    return db.query(CartItem).filter(
        CartItem.cart_id == cart_id
    ).all()


# Remove cart item
@router.delete("/{item_id}")
def delete_cart_item(item_id: int, db: Session = Depends(get_db)):
    item = db.query(CartItem).filter(CartItem.id == item_id).first()

    if not item:
        raise HTTPException(404, "Cart item not found")

    db.delete(item)
    db.commit()

    return {"message": "Cart item removed"}