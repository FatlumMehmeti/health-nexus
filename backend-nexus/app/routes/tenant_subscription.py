from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.tenant_subscription import TenantSubscription
from app.schemas.tenant_subscription import (
    TenantSubscriptionCreate,
    TenantSubscriptionRead
)

router = APIRouter(
    prefix="/tenant-subscriptions",
    tags=["Tenant Subscriptions"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=TenantSubscriptionRead)
def create_subscription(
    data: TenantSubscriptionCreate,
    db: Session = Depends(get_db)
):

    sub = TenantSubscription(**data.model_dump())

    db.add(sub)
    db.commit()
    db.refresh(sub)

    return sub


@router.get("/", response_model=List[TenantSubscriptionRead])
def list_subscriptions(db: Session = Depends(get_db)):
    return db.query(TenantSubscription).all()


@router.get("/{sub_id}", response_model=TenantSubscriptionRead)
def get_subscription(sub_id: int, db: Session = Depends(get_db)):

    sub = db.query(TenantSubscription).filter(
        TenantSubscription.id == sub_id
    ).first()

    if not sub:
        raise HTTPException(404, "Subscription not found")

    return sub