from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user
from app.db import get_db
from app.models.appointment import Appointment, AppointmentStatus
from app.routes.appointment import _get_doctor_overlap, _record_status_change, _require_doctor


router = APIRouter(prefix="/appointments", tags=["Doctor Appointments"])


@router.get("/doctor/me", response_model=list[dict])
def list_my_appointments(
    status: AppointmentStatus | None = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doctor = _require_doctor(current_user, db)
    query = db.query(Appointment).filter(
        Appointment.doctor_user_id == doctor.user_id,
        Appointment.tenant_id == doctor.tenant_id,
    )
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
    doctor = _require_doctor(current_user, db)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(404, "Appointment not found")
    if appointment.doctor_user_id != doctor.user_id:
        raise HTTPException(403, "You can only approve your own appointments")
    if appointment.tenant_id != doctor.tenant_id:
        raise HTTPException(403, "You can only approve appointments in your tenant")
    if appointment.status == AppointmentStatus.CONFIRMED:
        return {"id": appointment.id, "status": appointment.status.value}
    if appointment.status in (AppointmentStatus.CANCELLED, AppointmentStatus.COMPLETED):
        raise HTTPException(400, "This appointment cannot be approved")

    conflict = _get_doctor_overlap(
        db=db,
        doctor_id=appointment.doctor_user_id,
        start_dt=appointment.appointment_datetime,
        duration_minutes=appointment.duration_minutes,
        exclude_appointment_id=appointment.id,
        statuses=(AppointmentStatus.CONFIRMED,),
    )
    if conflict:
        raise HTTPException(
            400,
            {
                "message": "Doctor already has an appointment at this time",
                "conflict_appointment_id": conflict.id,
            },
        )

    old_status = appointment.status
    appointment.status = AppointmentStatus.CONFIRMED
    _record_status_change(
        db=db,
        appointment=appointment,
        old_status=old_status,
        new_status=AppointmentStatus.CONFIRMED,
        changed_by=doctor.user_id,
    )
    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status.value}


@router.patch("/{appointment_id}/complete", response_model=dict)
def complete_appointment(
    appointment_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user),
):
    doctor = _require_doctor(current_user, db)
    appointment = db.query(Appointment).filter(Appointment.id == appointment_id).first()
    if not appointment:
        raise HTTPException(404, "Appointment not found")
    if appointment.doctor_user_id != doctor.user_id:
        raise HTTPException(403, "You can only complete your own appointments")
    if appointment.tenant_id != doctor.tenant_id:
        raise HTTPException(403, "You can only complete appointments in your tenant")
    if appointment.status == AppointmentStatus.COMPLETED:
        return {"id": appointment.id, "status": appointment.status.value}
    if appointment.status == AppointmentStatus.CANCELLED:
        raise HTTPException(400, "Cancelled appointments cannot be completed")
    if appointment.status != AppointmentStatus.CONFIRMED:
        raise HTTPException(400, "Only confirmed appointments can be completed")

    old_status = appointment.status
    appointment.status = AppointmentStatus.COMPLETED
    _record_status_change(
        db=db,
        appointment=appointment,
        old_status=old_status,
        new_status=AppointmentStatus.COMPLETED,
        changed_by=doctor.user_id,
    )
    db.commit()
    db.refresh(appointment)
    return {"id": appointment.id, "status": appointment.status.value}
