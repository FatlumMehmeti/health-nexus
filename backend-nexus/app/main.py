from fastapi import FastAPI

app = FastAPI(title="Healthcare SaaS API")


@app.get("/")
def health_check():
    return {"status": "ok"}
