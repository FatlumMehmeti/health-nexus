from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.tenant_department import TenantDepartment
from app.models.tenant import Tenant
from app.models.department import Department
from app.schemas.tenant_department import (
    TenantDepartmentCreate,
    TenantDepartmentRead,
    TenantDepartmentUpdate
)

router = APIRouter(
    prefix="/tenant-departments",
    tags=["Tenant Departments"]
)

# ===============================
# Create Tenant Department Mapping
# ===============================

@router.post("/", response_model=TenantDepartmentRead)
def create_tenant_department(
    payload: TenantDepartmentCreate,
    db: Session = Depends(get_db)
):
    # Validate tenant exists
    tenant = db.query(Tenant).get(payload.tenant_id)
    if not tenant:
        raise HTTPException(
            status_code=404,
            detail="Tenant not found"
        )

    # Validate department exists
    department = db.query(Department).get(payload.department_id)
    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )

    # Prevent duplicate mapping (SaaS safety)
    existing = db.query(TenantDepartment).filter(
        TenantDepartment.tenant_id == payload.tenant_id,
        TenantDepartment.department_id == payload.department_id
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Tenant department already exists"
        )

    tenant_department = TenantDepartment(**payload.dict())

    db.add(tenant_department)
    db.commit()
    db.refresh(tenant_department)

    return tenant_department


@router.get("/", response_model=list[TenantDepartmentRead])
def get_tenant_departments(db: Session = Depends(get_db)):
    return db.query(TenantDepartment).all()


@router.get("/tenant/{tenant_id}", response_model=list[TenantDepartmentRead])
def get_tenant_departments_by_tenant(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    return db.query(TenantDepartment).filter(
        TenantDepartment.tenant_id == tenant_id
    ).all()


@router.put("/{tenant_department_id}", response_model=TenantDepartmentRead)
def update_tenant_department(
    tenant_department_id: int,
    payload: TenantDepartmentUpdate,
    db: Session = Depends(get_db)
):
    td = db.query(TenantDepartment).get(tenant_department_id)

    if not td:
        raise HTTPException(
            status_code=404,
            detail="Tenant department not found"
        )

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(td, key, value)

    db.commit()
    db.refresh(td)

    return td


@router.delete("/{tenant_department_id}")
def delete_tenant_department(
    tenant_department_id: int,
    db: Session = Depends(get_db)
):
    td = db.query(TenantDepartment).get(tenant_department_id)

    if not td:
        raise HTTPException(
            status_code=404,
            detail="Tenant department not found"
        )

    db.delete(td)
    db.commit()

    return {"message": "Tenant department deleted"}