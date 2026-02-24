# app/routes/report.py

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportRead

router = APIRouter(prefix="/reports", tags=["Reports"])


@router.get("/", response_model=list[ReportRead])
def get_reports(db: Session = Depends(get_db)):
    return db.query(Report).all()


@router.get("/{report_id}", response_model=ReportRead)
def get_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).get(report_id)

    if not report:
        raise HTTPException(404, "Report not found")

    return report


@router.post("/", response_model=ReportRead)
def create_report(
    payload: ReportCreate,
    db: Session = Depends(get_db)
):
    report = Report(**payload.model_dump())

    db.add(report)
    db.commit()
    db.refresh(report)

    return report


@router.delete("/{report_id}")
def delete_report(report_id: int, db: Session = Depends(get_db)):
    report = db.query(Report).get(report_id)

    if not report:
        raise HTTPException(404, "Report not found")

    db.delete(report)
    db.commit()

    return {"message": "Deleted"}