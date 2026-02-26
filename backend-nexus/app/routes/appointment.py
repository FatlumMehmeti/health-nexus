from datetime import datetime, timedelta
from sqlalchemy import and_, or_
from sqlalchemy.exc import SQLAlchemyError
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth.auth_utils import get_current_user
from app.db import get_db
from app.models.patient import Patient
from app.models.enrollment import Enrollment, EnrollmentStatus
from app.models.appointment import Appointment, AppointmentStatus
from app.models.appointment_status_history import AppointmentStatusHistory
from app.models.doctor import Doctor
from app.schemas.appointment import AppointmentCreate


router = APIRouter(prefix="/appointments")


def _parse_work_block(block: object) -> tuple[str, str]:
    if isinstance(block, dict):
        start = block.get("start")
        end = block.get("end")
    elif isinstance(block, (list, tuple)) and len(block) == 2:
        start, end = block[0], block[1]
    else:
        raise HTTPException(400, "Invalid doctor working hours format")

    if not isinstance(start, str) or not isinstance(end, str):
        raise HTTPException(400, "Invalid doctor working hours format")

    return start, end


def _normalize_day_blocks(day_blocks: object) -> list[object]:
    if (
        isinstance(day_blocks, list)
        and len(day_blocks) == 2
        and isinstance(day_blocks[0], str)
        and isinstance(day_blocks[1], str)
    ):
        return [day_blocks]
    if isinstance(day_blocks, list):
        return day_blocks
    raise HTTPException(400, "Invalid doctor working hours format")


def _require_doctor(current_user: dict, db: Session) -> int:
    role = str(current_user.get("role", "")).upper()
    if role != "DOCTOR":
        raise HTTPException(403, "Only doctors can perform this action")

    user_id = current_user.get("user_id")
    if user_id is None:
        raise HTTPException(401, "Invalid token payload")

    doctor = db.query(Doctor).filter_by(user_id=user_id).first()
    if not doctor:
        raise HTTPException(403, "Doctor profile not found")

    return user_id


def book_appointment(
    db,
    current_user,
    tenant_id: int,
    doctor_id: int,
    department_id: int,
    appointment_datetime: datetime,
    duration_minutes: int = 30,
    description: str | None = None
):
    user_id = current_user.get("user_id") if isinstance(current_user, dict) else current_user.id

    try:
        patient = db.query(Patient).filter_by(
            user_id=user_id
        ).first()

        if not patient:
            raise HTTPException(403, "Only patients can book appointments")

        enrollment = db.query(Enrollment).filter(
            Enrollment.tenant_id == tenant_id,
            Enrollment.patient_user_id == user_id,
            Enrollment.status == EnrollmentStatus.ACTIVE
        ).first()

        if not enrollment:
            raise HTTPException(403, "You are not enrolled in this tenant")

        if enrollment.expires_at and enrollment.expires_at < datetime.utcnow():
            raise HTTPException(403, "Your plan has expired")

        doctor = db.query(Doctor).filter(
            Doctor.user_id == doctor_id,
            Doctor.tenant_id == tenant_id,
            Doctor.tenant_department_id == department_id,
            Doctor.is_active == True
        ).first()

        if not doctor:
            raise HTTPException(404, "Doctor not found in this department")

        plan = enrollment.user_tenant_plan

        if plan.max_appointments:
            appointment_count = db.query(Appointment).filter(
                Appointment.patient_user_id == user_id,
                Appointment.tenant_id == tenant_id,
                Appointment.status.in_([
                    AppointmentStatus.REQUESTED,
                    AppointmentStatus.CONFIRMED
                ])
            ).count()

            if appointment_count >= plan.max_appointments:
                raise HTTPException(403, "Appointment limit reached for your plan")

        weekday = appointment_datetime.strftime("%A").lower()
        working_hours = doctor.working_hours or {}

        if weekday not in working_hours:
            raise HTTPException(400, "Doctor does not work this day")

        appointment_end = appointment_datetime + timedelta(minutes=duration_minutes)

        valid_slot = False

        for block in _normalize_day_blocks(working_hours[weekday]):
            start_str, end_str = _parse_work_block(block)
            block_start = datetime.strptime(start_str, "%H:%M").time()
            block_end = datetime.strptime(end_str, "%H:%M").time()

            if (
                block_start <= appointment_datetime.time() and
                appointment_end.time() <= block_end
            ):
                valid_slot = True
                break

        if not valid_slot:
            raise HTTPException(400, "Outside doctor's working hours")

        conflict = db.query(Appointment).filter(
            Appointment.doctor_user_id == doctor_id,
            Appointment.status.in_([
                AppointmentStatus.REQUESTED,
                AppointmentStatus.CONFIRMED
            ]),
            Appointment.appointment_datetime == appointment_datetime,
        ).first()

        if conflict:
            raise HTTPException(400, "Time slot already booked")

        appointment = Appointment(
            appointment_datetime=appointment_datetime,
            description=description,
            doctor_user_id=doctor_id,
            patient_user_id=user_id,
            tenant_id=tenant_id,
        )

        db.add(appointment)
        db.commit()
        db.refresh(appointment)

        return appointment

    except SQLAlchemyError:
        db.rollback()
        raise


def get_available_slots(db, doctor_id: int, date: datetime):

    doctor = db.query(Doctor).filter_by(user_id=doctor_id).first()
    if not doctor:
        raise HTTPException(404, "Doctor not found")

    weekday = date.strftime("%A").lower()
    working_hours = doctor.working_hours or {}

    if weekday not in working_hours:
        return []

    slots = []
    slot_duration = 30

    for block in _normalize_day_blocks(working_hours[weekday]):
        start_str, end_str = _parse_work_block(block)

        start = datetime.combine(
            date.date(),
            datetime.strptime(start_str, "%H:%M").time()
        )

        end = datetime.combine(
            date.date(),
            datetime.strptime(end_str, "%H:%M").time()
        )

        current = start
        while current + timedelta(minutes=slot_duration) <= end:

            appointment_end = current + timedelta(minutes=slot_duration)

            conflict = db.query(Appointment).filter(
                Appointment.doctor_user_id == doctor_id,
                Appointment.status.in_([
                    AppointmentStatus.REQUESTED,
                    AppointmentStatus.CONFIRMED
                ]),
                Appointment.appointment_datetime == current,
            ).first()

            if not conflict:
                slots.append(current)

            current += timedelta(minutes=slot_duration)

    return slots


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

    old_status = appointment.status
    appointment.status = AppointmentStatus.CONFIRMED
    db.add(
        AppointmentStatusHistory(
            appointment_id=appointment.id,
            old_status=old_status,
            new_status=AppointmentStatus.CONFIRMED,
            changed_by=doctor_user_id,
        )
    )
    db.commit()
    db.refresh(appointment)

    return {"id": appointment.id, "status": appointment.status.value}
