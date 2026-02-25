from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Doctor
from app.schemas.doctor import DoctorRead

router = APIRouter(prefix="/doctors", tags=["Doctors"])


@router.get("/", response_model=list[DoctorRead])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(Doctor).all()


@router.get("/{user_id}", response_model=DoctorRead)
def get_doctor(user_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()

    if not doctor:
        raise HTTPException(404, "Doctor not found")

    return doctor
