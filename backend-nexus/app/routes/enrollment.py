from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db import SessionLocal
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.schemas.enrollment import EnrollmentCreate, EnrollmentRead

router = APIRouter(
    prefix="/enrollments",
    tags=["Enrollments"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Create Enrollment
@router.post("/", response_model=EnrollmentRead)
def create_enrollment(
    enrollment: EnrollmentCreate,
    db: Session = Depends(get_db)
):

    # Prevent duplicate enrollment (extra safety)
    existing = db.query(Enrollment).filter(
        Enrollment.tenant_id == enrollment.tenant_id,
        Enrollment.patient_user_id == enrollment.patient_user_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Patient already enrolled in this tenant"
        )

    db_enrollment = Enrollment(**enrollment.model_dump())

    db.add(db_enrollment)
    db.commit()
    db.refresh(db_enrollment)

    return db_enrollment


# Get All Enrollments
@router.get("/", response_model=List[EnrollmentRead])
def get_enrollments(db: Session = Depends(get_db)):
    return db.query(Enrollment).all()


# Get Enrollment By ID
@router.get("/{enrollment_id}", response_model=EnrollmentRead)
def get_enrollment(
    enrollment_id: int,
    db: Session = Depends(get_db)
):

    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id
    ).first()

    if not enrollment:
        raise HTTPException(404, "Enrollment not found")

    return enrollment


# Update Enrollment Status
@router.patch("/{enrollment_id}", response_model=EnrollmentRead)
def update_enrollment_status(
    enrollment_id: int,
    status: EnrollmentStatus,
    db: Session = Depends(get_db)
):

    enrollment = db.query(Enrollment).filter(
        Enrollment.id == enrollment_id
    ).first()

    if not enrollment:
        raise HTTPException(404, "Enrollment not found")

    enrollment.status = status
    db.commit()
    db.refresh(enrollment)

    return enrollment