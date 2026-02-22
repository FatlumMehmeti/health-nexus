"""
Integration tests for auth: RBAC, refresh, and logout.
Uses conftest's reset_database and db_session; seeds roles and users for tests.
"""
import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.models import Role, User
from app.auth.auth_utils import hash_password, PERMISSIONS_MATRIX


@pytest.fixture
def client(db_session):
    """TestClient with DB seeded with admin and doctor roles/users."""
    admin_role = Role(name="admin")
    doctor_role = Role(name="doctor")
    db_session.add(admin_role)
    db_session.add(doctor_role)
    db_session.flush()

    admin_user = User(
        first_name="Admin",
        last_name="User",
        email="admin@test.com",
        password=hash_password("adminpass"),
        role_id=admin_role.id,
    )
    doctor_user = User(
        first_name="Doctor",
        last_name="User",
        email="doctor@test.com",
        password=hash_password("doctorpass"),
        role_id=doctor_role.id,
    )
    db_session.add(admin_user)
    db_session.add(doctor_user)
    db_session.commit()

    yield TestClient(app)


def test_get_auth_admin_without_auth_returns_401(client):
    """GET /auth/admin without Authorization header returns 401."""
    response = client.get("/auth/admin")
    assert response.status_code == 401


def test_get_auth_admin_as_doctor_returns_403(client):
    """Login as doctor, GET /auth/admin with Bearer token returns 403."""
    login_resp = client.post(
        "/auth/login",
        json={"email": "doctor@test.com", "password": "doctorpass"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["access_token"]

    response = client.get(
        "/auth/admin",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 403


def test_get_auth_admin_as_admin_returns_200(client):
    """Login as admin, GET /auth/admin returns 200."""
    login_resp = client.post(
        "/auth/login",
        json={"email": "admin@test.com", "password": "adminpass"},
    )
    assert login_resp.status_code == 200
    access_token = login_resp.json()["access_token"]

    response = client.get(
        "/auth/admin",
        headers={"Authorization": f"Bearer {access_token}"},
    )
    assert response.status_code == 200


def test_refresh_returns_new_access_token(client):
    """Login as doctor, POST /auth/refresh with refresh_token returns 200 and access_token."""
    login_resp = client.post(
        "/auth/login",
        json={"email": "doctor@test.com", "password": "doctorpass"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    response = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert response.status_code == 200
    assert "access_token" in response.json()


def test_logout_revokes_refresh_token(client):
    """After logout, using the same refresh token for /auth/refresh returns 401."""
    login_resp = client.post(
        "/auth/login",
        json={"email": "doctor@test.com", "password": "doctorpass"},
    )
    assert login_resp.status_code == 200
    refresh_token = login_resp.json()["refresh_token"]

    logout_resp = client.post(
        "/auth/logout",
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200

    refresh_resp = client.post(
        "/auth/refresh",
        json={"refresh_token": refresh_token},
    )
    assert refresh_resp.status_code == 401


def test_permissions_matrix_auth_admin():
    """PERMISSIONS_MATRIX has (GET, auth:admin) and it contains 'admin'."""
    key = ("GET", "auth:admin")
    assert key in PERMISSIONS_MATRIX
    assert "admin" in PERMISSIONS_MATRIX[key]
