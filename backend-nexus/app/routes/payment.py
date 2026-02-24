from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.payment import Payment, PaymentStatus
from app.schemas.payment import PaymentCreate, PaymentRead

router = APIRouter(
    prefix="/payments",
    tags=["Payments"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Payment
@router.post("/", response_model=PaymentRead)
def create_payment(payment: PaymentCreate, db: Session = Depends(get_db)):

    db_payment = Payment(**payment.model_dump())

    db.add(db_payment)
    db.commit()
    db.refresh(db_payment)

    return db_payment


# Get Payments
@router.get("/", response_model=List[PaymentRead])
def get_payments(db: Session = Depends(get_db)):
    return db.query(Payment).all()


# Update Payment Status
@router.patch("/{payment_id}", response_model=PaymentRead)
def update_payment_status(
    payment_id: int,
    status: PaymentStatus,
    db: Session = Depends(get_db)
):

    payment = db.query(Payment).filter(
        Payment.payment_id == payment_id
    ).first()

    if not payment:
        raise HTTPException(404, "Payment not found")

    payment.status = status
    db.commit()
    db.refresh(payment)

    return payment