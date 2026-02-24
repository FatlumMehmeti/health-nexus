from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.db import get_db
from app.models.lead import Lead
from app.schemas.lead import LeadCreate, LeadRead, LeadUpdate
from app.models.lead_status_history import LeadStatusHistory
from app.schemas.lead_status_history import LeadStatusHistoryRead

router = APIRouter(prefix="/leads", tags=["Leads CRM"])


@router.get("/", response_model=list[LeadRead])
def get_leads(db: Session = Depends(get_db)):
    return db.query(Lead).all()


@router.post("/", response_model=LeadRead)
def create_lead(payload: LeadCreate, db: Session = Depends(get_db)):
    lead = Lead(**payload.model_dump())
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.patch("/{lead_id}", response_model=LeadRead)
def update_lead(
    lead_id: int,
    payload: LeadUpdate,
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    update_data = payload.model_dump(exclude_unset=True)

    # if status changes track it in lead status history
    if "status" in update_data and update_data["status"] != lead.status:
        history = LeadStatusHistory(
            lead_id=lead.id,
            old_status=lead.status,
            new_status=update_data["status"],
            changed_by_user_id=None  # replace with current_user.id when auth exists
        )
        db.add(history)

    for key, value in update_data.items():
        setattr(lead, key, value)

    db.commit()
    db.refresh(lead)

    return lead


@router.delete("/{lead_id}")
def delete_lead(lead_id: int, db: Session = Depends(get_db)):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(404, "Lead not found")

    db.delete(lead)
    db.commit()

    return {"message": "Deleted"}


@router.get("/{lead_id}/history", response_model=list[LeadStatusHistoryRead])
def get_lead_history(
    lead_id: int,
    db: Session = Depends(get_db)
):
    lead = db.query(Lead).filter(Lead.id == lead_id).first()

    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    history = (
        db.query(LeadStatusHistory)
        .filter(LeadStatusHistory.lead_id == lead_id)
        .order_by(LeadStatusHistory.changed_at.desc())
        .all()
    )

    return history