from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user
from app.db import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.models.doctor import Doctor
from app.schemas.appointment import AppointmentCreate
from app.routes.appointment import (
    _has_doctor_overlap,
    _normalize_datetime,
    _record_status_change,
    _require_patient,
    _validate_slot_for_doctor,
    book_appointment,
)


router = APIRouter(prefix="/appointments", tags=["Patient Appointments"])


@router.post("/book", response_model=dict)
def book_appointment_endpoint(
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    appointment = book_appointment(
        db=db,
        current_user=current_user,
        tenant_id=payload.tenant_id,
        doctor_id=payload.doctor_id,
        department_id=payload.department_id,
        appointment_datetime=payload.appointment_datetime,
        duration_minutes=payload.duration_minutes,
        description=payload.description,
    )
    return {"id": appointment.id, "status": appointment.status.value}


@router.patch("/{appointment_id}/reschedule", response_model=dict)
def reschedule_appointment(
    appointment_id: int,
    payload: AppointmentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    normalized_dt = _normalize_datetime(payload.appointment_datetime)
    user_id = _require_patient(current_user, db, payload.tenant_id)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(404, "Appointment not found")
    if appointment.patient_user_id != user_id:
        raise HTTPException(403, "You can only reschedule your own appointments")
    if appointment.tenant_id != payload.tenant_id:
        raise HTTPException(400, "Tenant mismatch for appointment")
    if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(400, "This appointment cannot be rescheduled")

    doctor = db.query(Doctor).filter(
        Doctor.user_id == payload.doctor_id,
        Doctor.tenant_id == payload.tenant_id,
        Doctor.tenant_department_id == payload.department_id,
        Doctor.is_active == True,
    ).first()
    if not doctor:
        raise HTTPException(404, "Doctor not found in this department")

    _validate_slot_for_doctor(doctor, normalized_dt, payload.duration_minutes)

    if _has_doctor_overlap(
        db=db,
        doctor_id=payload.doctor_id,
        start_dt=normalized_dt,
        duration_minutes=payload.duration_minutes,
        exclude_appointment_id=appointment.id,
        statuses=(AppointmentStatus.REQUESTED, AppointmentStatus.CONFIRMED),
    ):
        raise HTTPException(400, "Time slot already booked")

    appointment.appointment_datetime = normalized_dt
    appointment.description = payload.description
    appointment.doctor_user_id = payload.doctor_id
    if appointment.status != AppointmentStatus.REQUESTED:
        old_status = appointment.status
        appointment.status = AppointmentStatus.REQUESTED
        _record_status_change(
            db=db,
            appointment=appointment,
            old_status=old_status,
            new_status=AppointmentStatus.REQUESTED,
            changed_by=user_id,
        )

    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status.value}


@router.patch("/{appointment_id}/cancel", response_model=dict)
def cancel_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    user_id = current_user.get("user_id")
    if user_id is None:
        raise HTTPException(401, "Invalid token payload")

    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(404, "Appointment not found")

    role = str(current_user.get("role", "")).upper()
    is_doctor = role == "DOCTOR" and appointment.doctor_user_id == user_id
    is_patient = appointment.patient_user_id == user_id
    if not (is_doctor or is_patient):
        raise HTTPException(403, "You can only cancel your own appointments")

    if appointment.status == AppointmentStatus.CANCELLED:
        return {"id": appointment.id, "status": appointment.status.value}
    if appointment.status == AppointmentStatus.COMPLETED:
        raise HTTPException(400, "This appointment cannot be cancelled")

    old_status = appointment.status
    appointment.status = AppointmentStatus.CANCELLED
    _record_status_change(
        db=db,
        appointment=appointment,
        old_status=old_status,
        new_status=AppointmentStatus.CANCELLED,
        changed_by=user_id,
    )
    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status.value}
