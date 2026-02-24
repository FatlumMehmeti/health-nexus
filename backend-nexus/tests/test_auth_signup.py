"""
Pytest for POST /auth/signup: user creation and tenant membership.
Uses conftest's reset_database and db_session; seeds roles and tenants.
"""
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.main import app
from app.models import Role, Tenant, User, UserTenantMembership
from app.auth.auth_utils import hash_password, verify_password


@pytest.fixture
def client(db_session):
    """TestClient with DB seeded with role and tenant for signup."""
    role = Role(name="PATIENT")
    db_session.add(role)
    db_session.flush()
    tenant = Tenant()
    db_session.add(tenant)
    db_session.commit()
    yield TestClient(app)


@pytest.fixture
def client_with_doctor_role(db_session):
    """Client with doctor role and two tenants for multi-tenant signup tests."""
    role = Role(name="DOCTOR")
    db_session.add(role)
    db_session.flush()
    t1 = Tenant()
    t2 = Tenant()
    db_session.add_all([t1, t2])
    db_session.commit()
    yield TestClient(app)


def test_signup_success_creates_user_and_membership(client):
    """POST /auth/signup with valid body creates user and user_tenant_membership, returns 201."""
    response = client.post(
        "/auth/signup",
        json={
            "email": "new@example.com",
            "password": "secret123",
            "first_name": "New",
            "last_name": "User",
            "tenant_id": 1,
            "role": "client",
        },
    )
    assert response.status_code == 201
    data = response.json()
    assert data["email"] == "new@example.com"
    assert data["role"] == "PATIENT"
    assert data["tenant_id"] == 1
    assert "user_id" in data
    assert "password" not in data

    from app.db import SessionLocal
    session = SessionLocal()
    try:
        user = session.execute(select(User).where(User.email == "new@example.com")).scalar_one()
        assert user.first_name == "New"
        assert user.last_name == "User"
        m = session.execute(
            select(UserTenantMembership).where(
                UserTenantMembership.user_id == user.id,
                UserTenantMembership.tenant_id == 1,
            )
        ).scalar_one()
        assert m is not None
    finally:
        session.close()


def test_signup_duplicate_email_same_tenant_returns_409(client):
    """Signup again with same email and tenant_id returns 409 Conflict."""
    payload = {
        "email": "dup@example.com",
        "password": "pass1234",
        "first_name": "D",
        "last_name": "U",
        "tenant_id": 1,
        "role": "client",
    }
    r1 = client.post("/auth/signup", json=payload)
    assert r1.status_code == 201
    r2 = client.post("/auth/signup", json=payload)
    assert r2.status_code == 409
    assert "already" in r2.json().get("detail", "").lower() or "membership" in r2.json().get("detail", "").lower()


def test_signup_same_email_new_tenant_creates_membership(client_with_doctor_role):
    """Same email for a different tenant creates only membership, returns 201."""
    payload = {
        "email": "multi@example.com",
        "password": "pass1234",
        "first_name": "Multi",
        "last_name": "Tenant",
        "tenant_id": 1,
        "role": "doctor",
    }
    r1 = client_with_doctor_role.post("/auth/signup", json=payload)
    assert r1.status_code == 201
    user_id_first = r1.json()["user_id"]

    payload2 = {**payload, "tenant_id": 2}
    r2 = client_with_doctor_role.post("/auth/signup", json=payload2)
    assert r2.status_code == 201
    assert r2.json()["user_id"] == user_id_first
    assert r2.json()["tenant_id"] == 2

    from app.db import SessionLocal
    session = SessionLocal()
    try:
        memberships = session.execute(
            select(UserTenantMembership).where(UserTenantMembership.user_id == user_id_first)
        ).scalars().all()
        assert len(memberships) == 2
    finally:
        session.close()


def test_signup_tenant_not_found_returns_404(client):
    """Signup with non-existent tenant_id returns 404."""
    response = client.post(
        "/auth/signup",
        json={
            "email": "x@example.com",
            "password": "pass1234",
            "first_name": "X",
            "last_name": "Y",
            "tenant_id": 99999,
            "role": "client",
        },
    )
    assert response.status_code == 404
    assert "tenant" in response.json().get("detail", "").lower()


def test_signup_invalid_password_returns_422(client):
    """Password without letter or number or too short returns 422."""
    base = {
        "email": "v@example.com",
        "first_name": "V",
        "last_name": "V",
        "tenant_id": 1,
        "role": "client",
    }
    r_short = client.post("/auth/signup", json={**base, "password": "short1"})
    assert r_short.status_code == 422
    r_no_letter = client.post("/auth/signup", json={**base, "password": "12345678"})
    assert r_no_letter.status_code == 422
    r_no_digit = client.post("/auth/signup", json={**base, "password": "password"})
    assert r_no_digit.status_code == 422


def test_signup_password_is_hashed_in_db(client):
    """Password is stored hashed (bcrypt); not stored in plaintext."""
    plain = "mypass123"
    client.post(
        "/auth/signup",
        json={
            "email": "hashed@example.com",
            "password": plain,
            "first_name": "H",
            "last_name": "U",
            "tenant_id": 1,
            "role": "client",
        },
    )
    from app.db import SessionLocal
    session = SessionLocal()
    try:
        user = session.execute(select(User).where(User.email == "hashed@example.com")).scalar_one()
        assert user.password != plain
        assert verify_password(plain, user.password) is True
    finally:
        session.close()
