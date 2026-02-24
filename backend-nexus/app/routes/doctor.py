from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models import Doctor, User
from app.schemas.doctor import DoctorCreate, DoctorUpdate, DoctorRead

router = APIRouter(prefix="/doctors", tags=["Doctors"])


# -----------------------------
# GET ALL DOCTORS
# -----------------------------
@router.get("/", response_model=list[DoctorRead])
def get_doctors(db: Session = Depends(get_db)):
    return db.query(Doctor).all()


# -----------------------------
# GET DOCTOR BY USER ID
# -----------------------------
@router.get("/{user_id}", response_model=DoctorRead)
def get_doctor(user_id: int, db: Session = Depends(get_db)):
    doctor = db.query(Doctor).filter(Doctor.user_id == user_id).first()

    if not doctor:
        raise HTTPException(404, "Doctor not found")

    return doctor


# -----------------------------
# CREATE DOCTOR
# -----------------------------
@router.post("/", response_model=DoctorRead)
def create_doctor(payload: DoctorCreate, db: Session = Depends(get_db)):

    # Check if user exists
    user = db.query(User).filter(User.id == payload.user_id).first()
    if not user:
        raise HTTPException(404, "User not found")

    # Check if doctor already exists
    existing = db.query(Doctor).filter(
        Doctor.user_id == payload.user_id
    ).first()

    if existing:
        raise HTTPException(400, "Doctor profile already exists")

    doctor = Doctor(**payload.dict())

    db.add(doctor)
    db.commit()
    db.refresh(doctor)

    return doctor


# -----------------------------
# UPDATE DOCTOR
# -----------------------------
@router.put("/{user_id}", response_model=DoctorRead)
def update_doctor(
    user_id: int,
    payload: DoctorUpdate,
    db: Session = Depends(get_db)
):

    doctor = db.query(Doctor).filter(
        Doctor.user_id == user_id
    ).first()

    if not doctor:
        raise HTTPException(404, "Doctor not found")

    for key, value in payload.dict(exclude_unset=True).items():
        setattr(doctor, key, value)

    db.commit()
    db.refresh(doctor)

    return doctor


# -----------------------------
# DELETE DOCTOR
# -----------------------------
@router.delete("/{user_id}")
def delete_doctor(user_id: int, db: Session = Depends(get_db)):

    doctor = db.query(Doctor).filter(
        Doctor.user_id == user_id
    ).first()

    if not doctor:
        raise HTTPException(404, "Doctor not found")

    db.delete(doctor)
    db.commit()

    return {"message": "Doctor deleted"}


# -----------------------------
# TOGGLE ACTIVE STATUS
# (Very useful in SaaS systems)
# -----------------------------
@router.patch("/{user_id}/toggle")
def toggle_doctor(user_id: int, db: Session = Depends(get_db)):

    doctor = db.query(Doctor).filter(
        Doctor.user_id == user_id
    ).first()

    if not doctor:
        raise HTTPException(404, "Doctor not found")

    doctor.is_active = not doctor.is_active

    db.commit()
    db.refresh(doctor)

    return doctor