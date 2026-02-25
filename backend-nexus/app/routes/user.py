from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from typing import List
from app.db import get_db
from app.models import User, Role, Doctor, Patient, TenantManager
from app.schemas.user import UserCreate, UserRead
from app.auth.auth_utils import hash_password

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("/", response_model=List[UserRead])
def get_users(db: Session = Depends(get_db)):

    users = db.query(User).options(
        joinedload(User.role)
    ).all()

    return users

@router.post("/", response_model=UserRead, status_code=201)
def create_user(body: UserCreate, db: Session = Depends(get_db)):

    # check if user with email already exists
    if db.execute(select(User).where(User.email == body.email)).scalar_one_or_none():
        raise HTTPException(409, "User already exists")


    role = db.execute(select(Role).where(Role.id == body.role_id)).scalar_one_or_none()
    if not role:
        raise HTTPException(404, "Role not found")
    

    new_user = User(
        email=body.email,
        password=hash_password(body.password),
        first_name=body.first_name,
        last_name=body.last_name,
        contact=body.contact,
        address=body.address,
        role=role
    )
    db.add(new_user)
    db.flush()  # Get user.id without commit yet

    role_name = role.name.upper()

    # role-specific profile creation
    # patient
    if role_name == "PATIENT":
        patient_data = body.patient.dict() if body.patient else {}
        patient = Patient(user_id=new_user.id, **patient_data)
        db.add(patient)

    # doctor
    elif role_name == "DOCTOR":
        if not body.doctor or not body.doctor.tenant_id:
            raise HTTPException(400, "Doctor must have tenant_id and doctor profile data")

        doctor_data = body.doctor.dict(exclude_unset=True)
        doctor = Doctor(user_id=new_user.id, **doctor_data)
        db.add(doctor)

    # tenant manager
    elif role_name == "TENANT_MANAGER":
        if not body.tenant_manager:
            raise HTTPException(
                400,
                "Tenant manager profile data required"
            )

        manager = TenantManager(
            user_id=new_user.id,
            tenant_id=body.tenant_manager.tenant_id
        )

        db.add(manager)

    # SUPER_ADMIN / SALES → just create user

    db.commit()
    db.refresh(new_user)
    return new_user