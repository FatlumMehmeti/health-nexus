from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.appointment import Appointment
from app.models.appointment_status_history import AppointmentStatusHistory
from app.schemas.appointment import (
    AppointmentCreate,
    AppointmentRead,
    AppointmentUpdate
)
from app.schemas.appointment_status_history import AppointmentStatusHistoryRead

router = APIRouter(prefix="/appointments", tags=["Appointments"])


# ------------------------------------------------
# GET ALL
# ------------------------------------------------

@router.get("/", response_model=list[AppointmentRead])
def get_appointments(db: Session = Depends(get_db)):
    return db.query(Appointment).all()


# ------------------------------------------------
# CREATE APPOINTMENT
# ------------------------------------------------

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


# ------------------------------------------------
# UPDATE APPOINTMENT + HISTORY TRACKING ⭐
# ------------------------------------------------

@router.patch("/{appointment_id}", response_model=AppointmentRead)
def update_appointment(
    appointment_id: int,
    payload: AppointmentUpdate,
    db: Session = Depends(get_db)
):

    appointment = (
        db.query(Appointment)
        .filter(Appointment.id == appointment_id)
        .first()
    )

    if not appointment:
        raise HTTPException(404, "Appointment not found")

    # Save old status BEFORE update
    old_status = appointment.status

    # Update appointment fields
    update_data = payload.model_dump(exclude_unset=True)

    for k, v in update_data.items():
        setattr(appointment, k, v)

    # If status changed → create history record ⭐
    if "status" in update_data and update_data["status"] != old_status:

        history = AppointmentStatusHistory(
            appointment_id=appointment.id,
            old_status=old_status,
            new_status=update_data["status"],
            changed_by=None  # You can later replace with current user
        )

        db.add(history)

    db.commit()
    db.refresh(appointment)

    return appointment


# ------------------------------------------------
# DELETE
# ------------------------------------------------

@router.delete("/{appointment_id}")
def delete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db)
):

    appointment = db.query(Appointment).filter(
        Appointment.id == appointment_id
    ).first()

    if not appointment:
        raise HTTPException(404, "Appointment not found")

    db.delete(appointment)
    db.commit()

    return {"message": "Deleted"}


@router.get(
    "/{appointment_id}/history",
    response_model=list[AppointmentStatusHistoryRead]
)
def get_appointment_history(
    appointment_id: int,
    db: Session = Depends(get_db)
):

    return (
        db.query(AppointmentStatusHistory)
        .filter(AppointmentStatusHistory.appointment_id == appointment_id)
        .order_by(AppointmentStatusHistory.changed_at.desc())
        .all()
    )