from fastapi import FastAPI
from app.auth.auth_router import router as auth_router
from app.routes import role_router

app = FastAPI(title="Healthcare SaaS API", version="0.1.0")

# Include routers
app.include_router(role_router)

# include auth routes (/auth/login, /auth/me)
app.include_router(auth_router)

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Healthcare SaaS API is running"}


@app.get("/health")
def health_endpoint():
    return {"status": "healthy"}