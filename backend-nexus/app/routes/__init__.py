from .role import router as role_router
from .superadmin_tenant import router as superadmin_tenant_router
from .public_tenant import router as public_tenant_router
from .tenant_audit_log import router as tenant_audit_log
from .department import router as department_router
from .tenant_department import router as tenant_department_router
from .service import router as service_router
from .doctor import router as doctor_router
from .patient import router as patient_router
from .tenant_manager import router as tenant_manager_router

__all__ = ["role_router", "superadmin_tenant_router", "public_tenant_router", 'tenant_audit_log', 'department_router', 'tenant_department_router', 'service_router', 'doctor_router', 'patient_router', 'tenant_manager_router']