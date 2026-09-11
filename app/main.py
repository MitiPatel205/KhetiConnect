from fastapi import FastAPI

from app.core.config import API_V1_PREFIX, APP_NAME

app = FastAPI(
    title=APP_NAME,
    description="Farm operations management API for KhetiConnect",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "Welcome to KhetiConnect API",
        "docs": "/docs",
        "api_version": API_V1_PREFIX
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "kheticonnect-api"
    }