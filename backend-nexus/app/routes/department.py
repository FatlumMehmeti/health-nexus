from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.department import Department
from app.schemas.department import (
    DepartmentCreate,
    DepartmentUpdate,
    DepartmentRead,
)

router = APIRouter(prefix="/departments", tags=["Departments"])


# =========================
# Create Department
# =========================

@router.post("/", response_model=DepartmentRead)
def create_department(
    payload: DepartmentCreate,
    db: Session = Depends(get_db)
):
    # Check if exists
    existing = db.query(Department).filter(
        Department.name == payload.name
    ).first()

    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Department already exists"
        )

    department = Department(**payload.dict())

    db.add(department)
    db.commit()
    db.refresh(department)

    return department


# =========================
# Get All Departments
# =========================

@router.get("/", response_model=list[DepartmentRead])
def get_departments(db: Session = Depends(get_db)):
    return db.query(Department).order_by(Department.name).all()


# =========================
# Get Department By ID
# =========================

@router.get("/{department_id}", response_model=DepartmentRead)
def get_department(
    department_id: int,
    db: Session = Depends(get_db)
):
    department = db.query(Department).get(department_id)

    if not department:
        raise HTTPException(
            status_code=404,
            detail="Department not found"
        )

    return department


# =========================
# Update Department
# =========================

@router.put("/{department_id}", response_model=DepartmentRead)
def update_department(
    department_id: int,
    payload: DepartmentUpdate,
    db: Session = Depends(get_db)
):
    department = db.query(Department).get(department_id)

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    update_data = payload.dict(exclude_unset=True)

    for key, value in update_data.items():
        setattr(department, key, value)

    db.commit()
    db.refresh(department)

    return department


# =========================
# Delete Department
# =========================

@router.delete("/{department_id}")
def delete_department(
    department_id: int,
    db: Session = Depends(get_db)
):
    department = db.query(Department).get(department_id)

    if not department:
        raise HTTPException(status_code=404, detail="Department not found")

    db.delete(department)
    db.commit()

    return {"message": "Department deleted"}