"""Users (e.g. list doctors for assign-doctor dropdown)."""

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.user import User
from app.models.role import Role
from app.models.doctor import Doctor

router = APIRouter(prefix="/users", tags=["Users"])


class DoctorAssignableRead(BaseModel):
    """User with DOCTOR role for assign-doctor dropdown."""
    id: int
    first_name: str | None
    last_name: str | None
    email: str
    assigned_tenant_id: int | None

    class Config:
        from_attributes = True


@router.get("/doctors", response_model=list[DoctorAssignableRead])
def list_doctors_for_assign(
    exclude_tenant_id: int | None = Query(default=None, description="Exclude doctors already assigned to this tenant"),
    db: Session = Depends(get_db),
):
    doctor_role = db.query(Role).filter(Role.name == "DOCTOR").first()
    if not doctor_role:
        return []
    users = db.query(User).filter(User.role_id == doctor_role.id).order_by(User.first_name, User.last_name).all()
    doctors_by_user = {d.user_id: d for d in db.query(Doctor).filter(Doctor.user_id.in_(u.id for u in users)).all()}
    result = []
    for user in users:
        doc = doctors_by_user.get(user.id)
        tid = doc.tenant_id if doc else None
        if exclude_tenant_id is not None and tid == exclude_tenant_id:
            continue
        result.append(DoctorAssignableRead(id=user.id, first_name=user.first_name, last_name=user.last_name, email=user.email, assigned_tenant_id=tid))
    return result
