from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.consultation_booking import ConsultationBooking
from app.schemas.consultation_booking import (
    ConsultationCreate,
    ConsultationRead,
    ConsultationUpdate
)

router = APIRouter(prefix="/consultations", tags=["Consultations"])


@router.get("/", response_model=list[ConsultationRead])
def get_consultations(db: Session = Depends(get_db)):
    return db.query(ConsultationBooking).all()


@router.post("/", response_model=ConsultationRead)
def create_consultation(
    payload: ConsultationCreate,
    db: Session = Depends(get_db)
):
    consultation = ConsultationBooking(**payload.model_dump())

    db.add(consultation)
    db.commit()
    db.refresh(consultation)

    return consultation


@router.patch("/{consultation_id}", response_model=ConsultationRead)
def update_consultation(
    consultation_id: int,
    payload: ConsultationUpdate,
    db: Session = Depends(get_db)
):

    consultation = db.query(ConsultationBooking).get(consultation_id)

    if not consultation:
        raise HTTPException(404, "Consultation not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(consultation, k, v)

    db.commit()
    db.refresh(consultation)

    return consultation


@router.delete("/{consultation_id}")
def delete_consultation(consultation_id: int, db: Session = Depends(get_db)):

    consultation = db.query(ConsultationBooking).get(consultation_id)

    if not consultation:
        raise HTTPException(404, "Consultation not found")

    db.delete(consultation)
    db.commit()

    return {"message": "Deleted"}