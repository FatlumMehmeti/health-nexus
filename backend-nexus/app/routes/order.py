from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.order import Order, OrderStatus
from app.schemas.order import OrderCreate, OrderRead

router = APIRouter(
    prefix="/orders",
    tags=["Orders"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Order (Basic Version)
@router.post("/", response_model=OrderRead)
def create_order(order: OrderCreate, db: Session = Depends(get_db)):

    db_order = Order(**order.model_dump())

    db.add(db_order)
    db.commit()
    db.refresh(db_order)

    return db_order


# Get All Orders
@router.get("/", response_model=List[OrderRead])
def get_orders(db: Session = Depends(get_db)):
    return db.query(Order).all()


# Get Order by ID
@router.get("/{order_id}", response_model=OrderRead)
def get_order(order_id: int, db: Session = Depends(get_db)):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(404, "Order not found")

    return order


# Update Order Status
@router.patch("/{order_id}/status", response_model=OrderRead)
def update_status(order_id: int, status: OrderStatus, db: Session = Depends(get_db)):

    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(404, "Order not found")

    order.status = status
    db.commit()
    db.refresh(order)

    return order