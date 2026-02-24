from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from app.auth.auth_router import router as auth_router
from app.routes import role_router, superadmin_tenant_router, public_tenant_router, tenant_audit_log, department_router, tenant_department_router, service_router, doctor_router, patient_router, tenant_manager_router

app = FastAPI(title="Healthcare SaaS API", version="0.1.0")

# CORS configuration for development - allows frontend on various ports
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(role_router)
app.include_router(superadmin_tenant_router, prefix="/api/superadmin", tags=["Super Admin - Tenant Management"])
app.include_router(public_tenant_router, prefix="/api/public", tags=["Public Tenant Requests"])
app.include_router(auth_router, prefix="/api")
app.include_router(tenant_audit_log)
app.include_router(department_router)
app.include_router(tenant_department_router)
app.include_router(service_router)
app.include_router(doctor_router)
app.include_router(patient_router)
app.include_router(tenant_manager_router)

@app.get("/")
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_endpoint():
    return {"status": "healthy"}
