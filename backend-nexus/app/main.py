from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.config import get_storage_root
from app.auth.auth_router import router as auth_router
from app.routes import (
    role_router,
    enrollment_router,
    tenant_router,
    superadmin_tenant_router,
    department_router,
    user_router,
    font_router,
    brand_router,
    service_router,
    tenant_audit_log,
    user_tenant_plan_router,
    public_tenant_router,
    contract_router,
)

app = FastAPI(
    title="Healthcare SaaS API",
    version="0.1.0",
    swagger_ui_parameters={"persistAuthorization": True},
)

# Serve uploaded files at /uploads/ (e.g. /uploads/signatures/contract_1_doctor_xxx.png)
_uploads_dir = Path(get_storage_root())
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

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
app.include_router(tenant_router, prefix="/api")
app.include_router(superadmin_tenant_router, prefix="/api/superadmin")
app.include_router(department_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(font_router, prefix="/api")
app.include_router(brand_router, prefix="/api")
app.include_router(service_router, prefix="/api")
app.include_router(auth_router, prefix="/api")
app.include_router(public_tenant_router, prefix="/api/public")
app.include_router(tenant_audit_log)
app.include_router(enrollment_router, prefix="/api")
app.include_router(user_tenant_plan_router)
app.include_router(contract_router)


@app.get("/")
def root():
    return RedirectResponse(url="/docs")


@app.get("/health")
def health_endpoint():
    return {"status": "healthy"}
