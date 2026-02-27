from .role import router as role_router
from .superadmin_tenant import router as superadmin_tenant_router
from .public_tenant import router as public_tenant_router
from .tenant_audit_log import router as tenant_audit_log
from .appointment import router as appointment_router
from .doctor_appointment import router as doctor_appointment_router
from .patient_appointment import router as patient_appointment_router
from .appointment_status_history import router as appointment_status_history_router
from .notification import router as notification_router

__all__ = [
    "role_router",
    "superadmin_tenant_router",
    "public_tenant_router",
    "tenant_audit_log",
    "appointment_router",
    "doctor_appointment_router",
    "patient_appointment_router",
    "appointment_status_history_router",
    "notification_router",
]
