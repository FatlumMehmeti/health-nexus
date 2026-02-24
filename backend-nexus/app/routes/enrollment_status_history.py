from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.enrollment_status_history import EnrollmentStatusHistory
from app.schemas.enrollment_status_history import (
    EnrollmentStatusHistoryCreate,
    EnrollmentStatusHistoryRead
)

router = APIRouter(
    prefix="/enrollment-history",
    tags=["Enrollment History"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/", response_model=EnrollmentStatusHistoryRead)
def create_history(
    data: EnrollmentStatusHistoryCreate,
    db: Session = Depends(get_db)
):

    history = EnrollmentStatusHistory(**data.model_dump())

    db.add(history)
    db.commit()
    db.refresh(history)

    return history


@router.get("/{enrollment_id}", response_model=List[EnrollmentStatusHistoryRead])
def get_enrollment_history(
    enrollment_id: int,
    db: Session = Depends(get_db)
):

    return db.query(EnrollmentStatusHistory).filter(
        EnrollmentStatusHistory.enrollment_id == enrollment_id
    ).order_by(
        EnrollmentStatusHistory.changed_at.desc()
    ).all()