from fastapi import FastAPI

from app.core.config import API_V1_PREFIX, APP_NAME
from app.db.database import Base, engine
from app.models import Farm
from app.routers import tasks, crops, dashboard, farms, fields, inventory,maintenance,equipment, workers
from fastapi.middleware.cors import CORSMiddleware

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=APP_NAME,
    description="Farm operations management API for KhetiConnect",
    version="1.0.0"
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(farms.router, prefix=API_V1_PREFIX)
app.include_router(fields.router, prefix=API_V1_PREFIX)
app.include_router(crops.router, prefix=API_V1_PREFIX)
app.include_router(tasks.router, prefix=API_V1_PREFIX)
app.include_router(inventory.router, prefix=API_V1_PREFIX)
app.include_router(equipment.router, prefix=API_V1_PREFIX)
app.include_router(maintenance.router, prefix=API_V1_PREFIX)
app.include_router(dashboard.router, prefix=API_V1_PREFIX)
app.include_router(workers.router, prefix=API_V1_PREFIX)
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