from fastapi import FastAPI

app = FastAPI(
    title="KhetiConnect API",
    description="API for farm tasks and crop tracking",
    version="1.0.0"
)

@app.get("/")
def home():
    return {"message": "Welcome to KhetiConnect API"}

@app.get("/health")
def health_check():
    return {"status": "healthy"}