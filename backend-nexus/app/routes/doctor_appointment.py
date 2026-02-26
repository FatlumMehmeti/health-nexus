from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user
from app.db import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.routes.appointment import _has_doctor_overlap, _record_status_change, _require_doctor


router = APIRouter(prefix="/appointments", tags=["Doctor Appointments"])


@router.get("/doctor/me", response_model=list[dict])
def list_my_appointments(
    status: AppointmentStatus | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doctor_user_id = _require_doctor(current_user, db)
    query = db.query(Appointment).filter(Appointment.doctor_user_id == doctor_user_id)
    if status is not None:
        query = query.filter(Appointment.status == status)
    appointments = query.order_by(Appointment.appointment_datetime.asc()).all()
    return [
        {
            "id": appointment.id,
            "appointment_datetime": appointment.appointment_datetime,
            "description": appointment.description,
            "doctor_user_id": appointment.doctor_user_id,
            "patient_user_id": appointment.patient_user_id,
            "tenant_id": appointment.tenant_id,
            "status": appointment.status.value,
            "created_at": appointment.created_at,
            "updated_at": appointment.updated_at,
        }
        for appointment in appointments
    ]


@router.patch("/{appointment_id}/approve", response_model=dict)
def approve_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doctor_user_id = _require_doctor(current_user, db)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(404, "Appointment not found")
    if appointment.doctor_user_id != doctor_user_id:
        raise HTTPException(403, "You can only approve your own appointments")
    if appointment.status == AppointmentStatus.CONFIRMED:
        return {"id": appointment.id, "status": appointment.status.value}
    if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(400, "This appointment cannot be approved")

    if _has_doctor_overlap(
        db=db,
        doctor_id=appointment.doctor_user_id,
        start_dt=appointment.appointment_datetime,
        duration_minutes=30,
        exclude_appointment_id=appointment.id,
        statuses=(AppointmentStatus.CONFIRMED,),
    ):
        raise HTTPException(400, "Doctor already has an appointment at this time")

    old_status = appointment.status
    appointment.status = AppointmentStatus.CONFIRMED
    _record_status_change(
        db=db,
        appointment=appointment,
        old_status=old_status,
        new_status=AppointmentStatus.CONFIRMED,
        changed_by=doctor_user_id,
    )
    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status.value}
