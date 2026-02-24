from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.service import Service
from app.models.tenant_department import TenantDepartment
from app.schemas.service import ServiceCreate, ServiceRead, ServiceUpdate

router = APIRouter(prefix="/services", tags=["Services"])


# CREATE
@router.post("/", response_model=ServiceRead)
def create_service(
    payload: ServiceCreate,
    db: Session = Depends(get_db)
):

    # Validate tenant department exists
    td = db.query(TenantDepartment).get(payload.tenant_departments_id)

    if not td:
        raise HTTPException(
            status_code=404,
            detail="Tenant department not found"
        )

    # Prevent duplicate service names per department (SaaS safety)
    existing = db.query(Service).filter(
        Service.tenant_departments_id == payload.tenant_departments_id,
        Service.name == payload.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=400,
            detail="Service already exists in this department"
        )

    service = Service(**payload.dict())

    db.add(service)
    db.commit()
    db.refresh(service)

    return service


# READ ALL
@router.get("/", response_model=list[ServiceRead])
def get_services(db: Session = Depends(get_db)):
    return db.query(Service).all()


# READ BY TENANT
@router.get("/tenant/{tenant_id}", response_model=list[ServiceRead])
def get_services_by_tenant(
    tenant_id: int,
    db: Session = Depends(get_db)
):
    return db.query(Service).filter(
        Service.tenant_id == tenant_id
    ).all()


# UPDATE
@router.put("/{service_id}", response_model=ServiceRead)
def update_service(
    service_id: int,
    payload: ServiceUpdate,
    db: Session = Depends(get_db)
):

    service = db.query(Service).get(service_id)

    if not service:
        raise HTTPException(404, "Service not found")

    for k, v in payload.dict(exclude_unset=True).items():
        setattr(service, k, v)

    db.commit()
    db.refresh(service)

    return service


# DELETE
@router.delete("/{service_id}")
def delete_service(
    service_id: int,
    db: Session = Depends(get_db)
):

    service = db.query(Service).get(service_id)

    if not service:
        raise HTTPException(404, "Service not found")

    db.delete(service)
    db.commit()

    return {"message": "Service deleted"}