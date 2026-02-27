from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.auth.auth_utils import hash_password
from app.main import app
from app.models import (
    Department,
    Doctor,
    Enrollment,
    EnrollmentStatus,
    Patient,
    Role,
    Tenant,
    TenantDepartment,
    TenantStatus,
    User,
    UserTenantPlan,
)


def _login(client: TestClient, email: str, password: str) -> str:
    resp = client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture
def appointment_client(db_session):
    doctor_role = Role(name="DOCTOR")
    client_role = Role(name="CLIENT")
    db_session.add_all([doctor_role, client_role])
    db_session.flush()

    tenant = Tenant(
        name="Booking Tenant",
        email="booking.tenant@test.com",
        licence_number="BOOK-001",
        status=TenantStatus.approved,
    )
    db_session.add(tenant)
    db_session.flush()

    department = Department(name="Cardiology")
    db_session.add(department)
    db_session.flush()

    tenant_department = TenantDepartment(
        tenant_id=tenant.id,
        department_id=department.id,
        phone_number="123456",
    )
    db_session.add(tenant_department)
    db_session.flush()

    doctor_user = User(
        first_name="Doctor",
        last_name="One",
        email="doctor.booking@test.com",
        password=hash_password("Team2026@"),
        role_id=doctor_role.id,
    )
    patient_user = User(
        first_name="Client",
        last_name="One",
        email="client.booking@test.com",
        password=hash_password("Team2026@"),
        role_id=client_role.id,
    )
    other_doctor_user = User(
        first_name="Doctor",
        last_name="Two",
        email="doctor.other@test.com",
        password=hash_password("Team2026@"),
        role_id=doctor_role.id,
    )
    other_patient_user = User(
        first_name="Client",
        last_name="Two",
        email="client.other@test.com",
        password=hash_password("Team2026@"),
        role_id=client_role.id,
    )
    db_session.add_all([doctor_user, patient_user, other_doctor_user, other_patient_user])
    db_session.flush()

    other_tenant = Tenant(
        name="Other Tenant",
        email="other.tenant@test.com",
        licence_number="BOOK-002",
        status=TenantStatus.approved,
    )
    db_session.add(other_tenant)
    db_session.flush()

    other_tenant_department = TenantDepartment(
        tenant_id=other_tenant.id,
        department_id=department.id,
        phone_number="654321",
    )
    db_session.add(other_tenant_department)
    db_session.flush()

    doctor = Doctor(
        user_id=doctor_user.id,
        tenant_id=tenant.id,
        tenant_department_id=tenant_department.id,
        working_hours={
            "monday": [["09:00", "12:00"]],
            "tuesday": [["09:00", "12:00"]],
        },
        is_active=True,
    )
    db_session.add(doctor)
    other_doctor = Doctor(
        user_id=other_doctor_user.id,
        tenant_id=other_tenant.id,
        tenant_department_id=other_tenant_department.id,
        working_hours={
            "monday": [["09:00", "12:00"]],
            "tuesday": [["09:00", "12:00"]],
        },
        is_active=True,
    )
    db_session.add(other_doctor)

    patient = Patient(
        tenant_id=tenant.id,
        user_id=patient_user.id,
    )
    db_session.add(patient)
    other_patient = Patient(
        tenant_id=other_tenant.id,
        user_id=other_patient_user.id,
    )
    db_session.add(other_patient)
    db_session.flush()

    plan = UserTenantPlan(
        tenant_id=tenant.id,
        name="Starter Plan",
        description="Test plan",
        price=0,
        duration=30,
        max_appointments=10,
        max_consultations=5,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(plan)
    other_plan = UserTenantPlan(
        tenant_id=other_tenant.id,
        name="Other Starter Plan",
        description="Other test plan",
        price=0,
        duration=30,
        max_appointments=10,
        max_consultations=5,
        is_active=True,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )
    db_session.add(other_plan)
    db_session.flush()

    enrollment = Enrollment(
        tenant_id=tenant.id,
        patient_user_id=patient_user.id,
        user_tenant_plan_id=plan.id,
        created_by=patient_user.id,
        status=EnrollmentStatus.ACTIVE,
    )
    db_session.add(enrollment)
    other_enrollment = Enrollment(
        tenant_id=other_tenant.id,
        patient_user_id=other_patient_user.id,
        user_tenant_plan_id=other_plan.id,
        created_by=other_patient_user.id,
        status=EnrollmentStatus.ACTIVE,
    )
    db_session.add(other_enrollment)
    db_session.commit()

    payload = {
        "tenant_id": tenant.id,
        "department_id": tenant_department.id,
        "doctor_id": doctor_user.id,
        "doctor_email": doctor_user.email,
        "patient_email": patient_user.email,
        "other_doctor_email": other_doctor_user.email,
        "other_patient_email": other_patient_user.email,
        "other_tenant_id": other_tenant.id,
        "other_doctor_id": other_doctor_user.id,
    }
    yield TestClient(app), payload


def test_booking_lifecycle_end_to_end(appointment_client):
    client, ctx = appointment_client
    patient_token = _login(client, ctx["patient_email"], "Team2026@")
    doctor_token = _login(client, ctx["doctor_email"], "Team2026@")

    book_resp = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T10:00:00Z",
            "duration_minutes": 30,
            "description": "Initial consultation",
        },
    )
    assert book_resp.status_code == 200
    appointment_id = book_resp.json()["id"]
    assert book_resp.json()["status"] == "REQUESTED"

    doctor_list_resp = client.get(
        "/appointments/doctor/me",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert doctor_list_resp.status_code == 200
    assert any(a["id"] == appointment_id for a in doctor_list_resp.json())

    approve_resp = client.patch(
        f"/appointments/{appointment_id}/approve",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert approve_resp.status_code == 200
    assert approve_resp.json()["status"] == "CONFIRMED"

    reschedule_resp = client.patch(
        f"/appointments/{appointment_id}/reschedule",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T11:00:00Z",
            "duration_minutes": 30,
            "description": "Rescheduled consultation",
        },
    )
    assert reschedule_resp.status_code == 200
    assert reschedule_resp.json()["status"] == "REQUESTED"

    cancel_resp = client.patch(
        f"/appointments/{appointment_id}/cancel",
        headers={"Authorization": f"Bearer {patient_token}"},
    )
    assert cancel_resp.status_code == 200
    assert cancel_resp.json()["status"] == "CANCELLED"

    complete_resp = client.patch(
        f"/appointments/{appointment_id}/complete",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert complete_resp.status_code == 400

    history_resp = client.get(
        f"/appointments/{appointment_id}/status-history",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert history_resp.status_code == 200
    statuses = [item["new_status"] for item in history_resp.json()]
    assert statuses == ["REQUESTED", "CONFIRMED", "REQUESTED", "CANCELLED"]


def test_availability_and_conflict_checks(appointment_client):
    client, ctx = appointment_client
    patient_token = _login(client, ctx["patient_email"], "Team2026@")
    doctor_token = _login(client, ctx["doctor_email"], "Team2026@")

    first_booking = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T10:00:00Z",
            "duration_minutes": 30,
            "description": "Slot one",
        },
    )
    assert first_booking.status_code == 200
    first_appointment_id = first_booking.json()["id"]

    second_booking_conflict = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T10:00:00Z",
            "duration_minutes": 30,
            "description": "Slot overlap",
        },
    )
    assert second_booking_conflict.status_code == 400
    conflict_payload = second_booking_conflict.json()["detail"]
    assert conflict_payload["message"] == "Time slot already booked"
    assert conflict_payload["conflict_appointment_id"] == first_appointment_id

    approve_first = client.patch(
        f"/appointments/{first_appointment_id}/approve",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert approve_first.status_code == 200
    assert approve_first.json()["status"] == "CONFIRMED"

    conflict_after_confirm = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T10:00:00Z",
            "duration_minutes": 30,
            "description": "Slot conflict after confirm",
        },
    )
    assert conflict_after_confirm.status_code == 400
    conflict_payload = conflict_after_confirm.json()["detail"]
    assert conflict_payload["message"] == "Time slot already booked"
    assert conflict_payload["conflict_appointment_id"] == first_appointment_id

    availability = client.get(
        f"/appointments/doctor/{ctx['doctor_id']}/availability",
        params={"date": "2026-03-09"},
    )
    assert availability.status_code == 200
    assert "2026-03-09T10:00:00" not in "".join(availability.json())


def test_patient_without_enrollment_cannot_book(appointment_client, db_session):
    client, ctx = appointment_client

    client_role = db_session.query(Role).filter_by(name="CLIENT").first()
    assert client_role is not None

    user = User(
        first_name="No",
        last_name="Enrollment",
        email="no.enroll@test.com",
        password=hash_password("Team2026@"),
        role_id=client_role.id,
    )
    db_session.add(user)
    db_session.flush()

    patient = Patient(
        tenant_id=ctx["tenant_id"],
        user_id=user.id,
    )
    db_session.add(patient)
    db_session.commit()

    token = _login(client, "no.enroll@test.com", "Team2026@")
    response = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-10T10:00:00Z",
            "duration_minutes": 30,
            "description": "Should fail",
        },
    )
    assert response.status_code == 403
    assert response.json()["detail"] == "You are not enrolled in this tenant"


def test_past_datetime_rejected_for_booking_and_reschedule(appointment_client):
    client, ctx = appointment_client
    patient_token = _login(client, ctx["patient_email"], "Team2026@")

    past_book = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2020-01-01T10:00:00Z",
            "duration_minutes": 30,
            "description": "Past booking should fail",
        },
    )
    assert past_book.status_code == 400
    assert past_book.json()["detail"] == "Cannot book or reschedule appointments in the past"

    future_book = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-09T10:00:00Z",
            "duration_minutes": 30,
            "description": "Future booking for reschedule test",
        },
    )
    assert future_book.status_code == 200
    appointment_id = future_book.json()["id"]

    past_reschedule = client.patch(
        f"/appointments/{appointment_id}/reschedule",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2020-01-01T10:00:00Z",
            "duration_minutes": 30,
            "description": "Past reschedule should fail",
        },
    )
    assert past_reschedule.status_code == 400
    assert past_reschedule.json()["detail"] == "Cannot book or reschedule appointments in the past"


def test_tenant_isolation_for_doctor_actions(appointment_client):
    client, ctx = appointment_client
    patient_token = _login(client, ctx["patient_email"], "Team2026@")
    doctor_token = _login(client, ctx["doctor_email"], "Team2026@")
    other_doctor_token = _login(client, ctx["other_doctor_email"], "Team2026@")

    book_resp = client.post(
        "/appointments/book",
        headers={"Authorization": f"Bearer {patient_token}"},
        json={
            "tenant_id": ctx["tenant_id"],
            "doctor_id": ctx["doctor_id"],
            "department_id": ctx["department_id"],
            "appointment_datetime": "2026-03-10T10:00:00Z",
            "duration_minutes": 30,
            "description": "Isolation test",
        },
    )
    assert book_resp.status_code == 200
    appointment_id = book_resp.json()["id"]

    other_doctor_approve = client.patch(
        f"/appointments/{appointment_id}/approve",
        headers={"Authorization": f"Bearer {other_doctor_token}"},
    )
    assert other_doctor_approve.status_code == 403

    other_doctor_cancel = client.patch(
        f"/appointments/{appointment_id}/cancel",
        headers={"Authorization": f"Bearer {other_doctor_token}"},
    )
    assert other_doctor_cancel.status_code == 403

    other_doctor_list = client.get(
        "/appointments/doctor/me",
        headers={"Authorization": f"Bearer {other_doctor_token}"},
    )
    assert other_doctor_list.status_code == 200
    assert all(item["id"] != appointment_id for item in other_doctor_list.json())

    own_doctor_approve = client.patch(
        f"/appointments/{appointment_id}/approve",
        headers={"Authorization": f"Bearer {doctor_token}"},
    )
    assert own_doctor_approve.status_code == 200
