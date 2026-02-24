from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.order_item import OrderItem
from app.models.order import Order, OrderStatus
from app.models.product import Product
from app.schemas.order_item import OrderItemCreate, OrderItemRead

router = APIRouter(
    prefix="/order-items",
    tags=["Order Items"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Add Item to Order
@router.post("/", response_model=OrderItemRead)
def add_order_item(item: OrderItemCreate, db: Session = Depends(get_db)):

    order = db.query(Order).filter(Order.id == item.order_id).first()
    if not order:
        raise HTTPException(404, "Order not found")

    if order.status != OrderStatus.PENDING:
        raise HTTPException(400, "Cannot modify a non-pending order")

    product = db.query(Product).filter(
        Product.product_id == item.product_id
    ).first()

    if not product:
        raise HTTPException(404, "Product not found")

    if not product.is_available:
        raise HTTPException(400, "Product not available")

    if product.stock_quantity < item.quantity:
        raise HTTPException(400, "Not enough stock")

    # Price snapshot (VERY IMPORTANT FOR BILLING HISTORY)
    db_item = OrderItem(
        order_id=item.order_id,
        product_id=item.product_id,
        quantity=item.quantity,
        price_at_purchase=product.price
    )

    db.add(db_item)
    db.commit()
    db.refresh(db_item)

    return db_item


# Get Order Items
@router.get("/order/{order_id}", response_model=List[OrderItemRead])
def get_order_items(order_id: int, db: Session = Depends(get_db)):

    return db.query(OrderItem).filter(
        OrderItem.order_id == order_id
    ).all()


# Delete Order Item
@router.delete("/{item_id}")
def delete_order_item(item_id: int, db: Session = Depends(get_db)):

    item = db.query(OrderItem).filter(
        OrderItem.id == item_id
    ).first()

    if not item:
        raise HTTPException(404, "Order item not found")

    db.delete(item)
    db.commit()

    return {"message": "Order item deleted"}