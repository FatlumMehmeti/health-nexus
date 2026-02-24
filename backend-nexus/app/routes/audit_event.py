from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.audit_event import AuditEvent
from app.schemas.audit_event import AuditEventRead, AuditEventBase

router = APIRouter(
    prefix="/audit-events",
    tags=["Audit Events"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("/", response_model=List[AuditEventRead])
def list_events(db: Session = Depends(get_db)):
    return db.query(AuditEvent).order_by(AuditEvent.created_at.desc()).all()


@router.post("/", response_model=AuditEventRead)
def create_event(
    event: AuditEventBase,
    db: Session = Depends(get_db)
):

    db_event = AuditEvent(**event.model_dump())

    db.add(db_event)
    db.commit()
    db.refresh(db_event)

    return db_event


@router.get("/{tenant_id}")
def get_tenant_events(
    tenant_id: int,
    db: Session = Depends(get_db)
):

    return db.query(AuditEvent).filter(
        AuditEvent.tenant_id == tenant_id
    ).all()