from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.patient import Patient
from app.schemas.patient import (
    PatientCreate,
    PatientRead,
    PatientUpdate
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


@router.post("/", response_model=PatientRead)
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    existing = db.query(Patient).filter(
        Patient.user_id == patient.user_id
    ).first()

    if existing:
        raise HTTPException(400, "Patient profile already exists")

    new_patient = Patient(**patient.model_dump())

    db.add(new_patient)
    db.commit()
    db.refresh(new_patient)

    return new_patient


@router.put("/{user_id}", response_model=PatientRead)
def update_patient(
    user_id: int,
    payload: PatientUpdate,
    db: Session = Depends(get_db)
):
    patient = db.query(Patient).filter(
        Patient.user_id == user_id
    ).first()

    if not patient:
        raise HTTPException(404, "Patient not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(patient, key, value)

    db.commit()
    db.refresh(patient)

    return patient


@router.delete("/{user_id}")
def delete_patient(user_id: int, db: Session = Depends(get_db)):
    patient = db.query(Patient).filter(
        Patient.user_id == user_id
    ).first()

    if not patient:
        raise HTTPException(404, "Patient not found")

    db.delete(patient)
    db.commit()

    return {"message": "Deleted"}