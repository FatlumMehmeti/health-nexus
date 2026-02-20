from fastapi import FastAPI
from app.auth.auth_router import router as auth_router

app = FastAPI(title="Healthcare SaaS API")

# include auth routes (/auth/login, /auth/me)
app.include_router(auth_router)

@app.get("/")
def health_check():
    return {"status": "ok"}
