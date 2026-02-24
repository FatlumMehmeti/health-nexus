from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.cart import Cart, CartStatus
from app.schemas.cart import CartCreate, CartRead

router = APIRouter(
    prefix="/carts",
    tags=["Carts"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Cart
@router.post("/", response_model=CartRead)
def create_cart(cart: CartCreate, db: Session = Depends(get_db)):
    db_cart = Cart(**cart.model_dump())

    db.add(db_cart)
    db.commit()
    db.refresh(db_cart)

    return db_cart


# Get All Carts
@router.get("/", response_model=List[CartRead])
def get_carts(db: Session = Depends(get_db)):
    return db.query(Cart).all()


# Get Cart by ID
@router.get("/{cart_id}", response_model=CartRead)
def get_cart(cart_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    return cart


# Convert Cart
@router.patch("/{cart_id}/convert", response_model=CartRead)
def convert_cart(cart_id: int, db: Session = Depends(get_db)):
    cart = db.query(Cart).filter(Cart.id == cart_id).first()

    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart.status = CartStatus.CONVERTED

    db.commit()
    db.refresh(cart)

    return cart