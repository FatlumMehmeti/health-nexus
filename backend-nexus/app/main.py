from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import role_router, superadmin_tenant_router, public_tenant_router

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
app.include_router(superadmin_tenant_router, prefix="/api/superadmin", tags=["Super Admin - Tenant Management"], prefix="/tenants")
app.include_router(public_tenant_router, prefix="/api/public", tags=["Public Tenant Requests"])

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Healthcare SaaS API is running"}


@app.get("/health")
def health_endpoint():
    return {"status": "healthy"}
