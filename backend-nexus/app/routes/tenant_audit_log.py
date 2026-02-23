from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.db import SessionLocal
from app.models.tenant_audit_log import TenantAuditLog
from app.schemas.tenant_audit_log import TenantAuditLogRead


router = APIRouter(
    prefix="/audit-logs",
    tags=["Audit Logs"]
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("", response_model=list[TenantAuditLogRead])
def get_all_audit_logs(
    db: Session = Depends(get_db)
):
    logs = db.query(TenantAuditLog)\
        .order_by(TenantAuditLog.created_at.desc())\
        .all()

    return logs