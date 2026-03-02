from .role import router as role_router
from .tenant import router as tenant_router
from .superadmin_tenant import router as superadmin_tenant_router
from .department import router as department_router
from .user import router as user_router
from .font import router as font_router
from .brand import router as brand_router
from .service import router as service_router
from .tenant_audit_log import router as tenant_audit_log
from .enrollment import router as enrollment_router
from .user_tenant_plan import router as user_tenant_plan_router
from .public_tenant import router as public_tenant_router
from .appointment import router as appointment_router
from .doctor_appointment import router as doctor_appointment_router
from .patient_appointment import router as patient_appointment_router
from .appointment_status_history import router as appointment_status_history_router
from .notification import router as notification_router

__all__ = [
    "role_router",
    "tenant_router",
    "superadmin_tenant_router",
    "department_router",
    "user_router",
    "font_router",
    "brand_router",
    "service_router",
    "tenant_audit_log",
    "enrollment_router",
    "user_tenant_plan_router",
    "public_tenant_router",
    "appointment_router",
    "doctor_appointment_router",
    "patient_appointment_router",
    "appointment_status_history_router",
    "notification_router",
]
