# KhetiConnect

KhetiConnect is a full-stack farm operations management system for small farms and farm managers.

## Features

- Crop and field tracking
- Farm task management
- Equipment maintenance tracking
- Inventory monitoring and low-stock alerts
- Worker task assignments
- Responsive operations dashboard

## Tech Stack

- Backend: Python, FastAPI
- Frontend: Next.js, TypeScript, Tailwind CSS
- Database: SQLite for development, PostgreSQL for production
- Deployment: Render and Vercel
- Testing: Pytest
- Containerization: Docker

## Status

Currently under active development.

## Local Setup

```bash
python3 -m venv .venv
source .venv/bin/activate
python -m pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` to view the API documentation.