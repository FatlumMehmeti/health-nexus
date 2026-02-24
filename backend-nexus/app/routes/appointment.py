from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.appointment import Appointment
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate
)

router = APIRouter(prefix="/appointments", tags=["Appointments"])


@router.get("/", response_model=list[AppointmentRead])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).all()


@router.post("/", response_model=AppointmentRead)
def create_appointment(
    payload: AppointmentCreate,
    db: Session = Depends(get_db)
):

    appointment = Appointment(**payload.model_dump())

    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    return appointment


@router.patch("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db)
):

    appointment = db.query(Appointment).get(appointment_id)

    if not appointment:
        raise HTTPException(404, "Appointment not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(appointment, k, v)

    db.commit()
    db.refresh(appointment)

    return appointment


@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):

    appointment = db.query(Appointment).get(appointment_id)

    if not appointment:
        raise HTTPException(404, "Appointment not found")

    db.delete(appointment)
    db.commit()

    return {"message": "Deleted"}