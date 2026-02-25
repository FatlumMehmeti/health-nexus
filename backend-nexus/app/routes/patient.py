from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.patient import Patient
from app.schemas.patient import (
    PatientRead,
)

router = APIRouter(prefix="/patients", tags=["Patients"])


@router.get("/", response_model=list[PatientRead])
def get_patients(db: Session = Depends(get_db)):
    return db.query(Patient).all()


@router.get("/{user_id}", response_model=PatientRead)
def get_patient(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(Patient.user_id == user_id).first()

    if not patient:
        raise HTTPException(404, "Patient not found")

    return patient
