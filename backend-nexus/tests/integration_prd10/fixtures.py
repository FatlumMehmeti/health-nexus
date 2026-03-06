"""
Fixtures for PRD-10 integration tests (checkout initiation, idempotency, payment intent).
Uses root conftest db_session; overrides app get_db so requests use the test session.
"""

import pytest

from app.models import (
    Tenant,
    TenantStatus,
    Role,
    User,
    Order,
)
from app.models.order import OrderStatus
from app.auth.auth_utils import hash_password


def _make_get_db_override(session):
    def overridden_get_db():
        yield session

    return overridden_get_db


@pytest.fixture
def prd10_client(db_session):
    """TestClient with DB session for PRD-10. Overrides app get_db to use fixture db_session."""
    from fastapi.testclient import TestClient
    from app.main import app
    from app.db import get_db as app_get_db

    override = _make_get_db_override(db_session)
    app.dependency_overrides[app_get_db] = override
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.pop(app_get_db, None)


@pytest.fixture
def role_patient(db_session):
    """Ensure PATIENT role exists."""
    role = db_session.query(Role).filter(Role.name == "PATIENT").first()
    if role is None:
        role = Role(name="PATIENT")
        db_session.add(role)
        db_session.commit()
        db_session.refresh(role)
    return role


@pytest.fixture
def tenant_a(db_session, role_patient):
    """First tenant for PRD-10 tests."""
    tenant = Tenant(
        name="PRD10 Tenant A",
        email="prd10-tenant-a@example.com",
        licence_number="PRD10-LIC-A-001",
        status=TenantStatus.approved,
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


@pytest.fixture
def tenant_b(db_session, role_patient):
    """Second tenant for cross-tenant tests."""
    tenant = Tenant(
        name="PRD10 Tenant B",
        email="prd10-tenant-b@example.com",
        licence_number="PRD10-LIC-B-001",
        status=TenantStatus.approved,
    )
    db_session.add(tenant)
    db_session.commit()
    db_session.refresh(tenant)
    return tenant


def register_client_via_api(
    client,
    tenant_id: int,
    email: str,
    password: str = "PassPRD10!",
    first_name: str = "First",
    last_name: str = "Client",
    db_session=None,
    role=None,
):
    """
    Register a client under a tenant via POST /api/public/tenants/{tenant_id}/clients/register.
    Returns response JSON with user_id, patient_id, tenant_id.
    """
    payload = {
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
        "password": password,
    }
    resp = client.post(
        f"/api/public/tenants/{tenant_id}/clients/register",
        json=payload,
    )
    assert resp.status_code == 201, (resp.status_code, resp.text)
    data = resp.json()
    if db_session is not None and role is not None:
        user = db_session.query(User).filter(User.email == email).first()
        if user:
            user.role_id = role.id
            db_session.commit()
    return data


def login_client(client, email: str, password: str):
    """Login via POST /api/auth/login. Returns headers with Authorization Bearer token."""
    resp = client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
    )
    assert resp.status_code == 200, (resp.status_code, resp.text)
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def create_order_in_db(
    db_session,
    tenant_id: int,
    patient_user_id: int,
    total_amount: float = 100.0,
    status: OrderStatus = OrderStatus.PENDING,
):
    """
    Create an Order in the DB. Patient must exist for (tenant_id, patient_user_id).
    Returns the created Order.
    """
    order = Order(
        tenant_id=tenant_id,
        patient_user_id=patient_user_id,
        status=status,
        subtotal=total_amount,
        tax=0,
        discount=0,
        total_amount=total_amount,
    )
    db_session.add(order)
    db_session.commit()
    db_session.refresh(order)
    return order


def checkout_initiate_via_api(
    client,
    order_id: int,
    idempotency_key: str,
    auth_headers: dict,
):
    """
    POST /api/checkout/initiate with body { order_id } and Idempotency-Key header.
    Returns the response object.
    """
    return client.post(
        "/api/checkout/initiate",
        json={"order_id": order_id},
        headers={
            **auth_headers,
            "Idempotency-Key": idempotency_key,
        },
    )
