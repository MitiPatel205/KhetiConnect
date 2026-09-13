# KhetiConnect

KhetiConnect is a full-stack farm operations management system designed for small farms and farm managers. It centralizes day-to-day farm information—including farms, fields, crops, tasks, inventory, equipment, and maintenance records—in one responsive web application.

The application provides a live, farm-specific dashboard so managers can quickly review crop activity, open tasks, low-stock supplies, and upcoming equipment maintenance.

## Features

### Farm operations management

- Create, view, update, and delete farms
- Store farm location, acreage, and notes
- Select the current farm from the dashboard
- Persist the selected farm in the browser between pages

### Fields and crops

- Create, view, update, and delete fields for each farm
- Track field acreage, soil type, operational status, and notes
- Create, view, update, and delete crops assigned to fields
- Track crop variety, planting date, expected harvest date, growth stage, status, and notes

### Task planning

- Create, view, update, and delete farm tasks
- Assign tasks to a farm, field, and optional crop
- Set due dates, priorities, statuses, descriptions, and notes
- Filter tasks by status and priority
- Identify overdue work and completed tasks

### Inventory monitoring

- Create, view, update, and delete inventory records
- Track item category, quantity, unit, reorder level, supplier, expiry date, and notes
- Identify low-stock items using backend-calculated stock status
- Filter the inventory list to show only low-stock supplies

### Equipment and maintenance

- Create, view, update, and delete equipment records
- Track equipment category, asset tag, condition, purchase date, and service dates
- Identify equipment with maintenance due
- Create, view, update, and delete maintenance logs
- Record service date, description, cost, provider, and notes
- Access maintenance history directly from each equipment record

### Dashboard

- Loads live data from the FastAPI backend
- Displays the selected farm and location
- Shows total fields, active crops, open tasks, low-stock items, overdue tasks, completed tasks, and maintenance due
- Displays upcoming tasks and priority labels
- Provides navigation from summary cards and alert panels to relevant management pages

## Tech Stack

| Area | Technology |
|---|---|
| Backend | Python, FastAPI |
| Database ORM | SQLAlchemy |
| Validation | Pydantic |
| Development database | SQLite |
| Frontend | Next.js 16, React, TypeScript |
| Styling | Tailwind CSS |
| Frontend linting | ESLint |
| Backend testing | Pytest |
| Development server | Uvicorn |
| API documentation | FastAPI Swagger UI / OpenAPI |

## Project Structure

```text
KhetiConnect/
├── app/
│   ├── core/              # Application configuration
│   ├── db/                # Database setup and dependencies
│   ├── models/            # SQLAlchemy database models
│   ├── routers/           # FastAPI API route modules
│   ├── schemas/           # Pydantic request and response schemas
│   └── main.py            # FastAPI application entry point
├── frontend/
│   ├── app/               # Next.js application routes and pages
│   │   ├── crops/
│   │   ├── equipment/
│   │   ├── farms/
│   │   ├── fields/
│   │   ├── inventory/
│   │   ├── maintenance/
│   │   └── tasks/
│   ├── package.json
│   └── eslint.config.mjs
├── tests/                 # Backend Pytest test suite
├── requirements.txt       # Python dependencies
└── pytest.ini             # Pytest configuration
```

## Prerequisites

Install the following before running the project:

- Python 3.11 or later
- Node.js 20.9 or later
- npm

Verify your local versions:

```bash
python3 --version
node --version
npm --version
```

## Local Setup

### 1. Clone the repository

```bash
git clone [https://github.com/MitiPatel205/KhetiConnect.git](https://github.com/MitiPatel205/KhetiConnect.git)
cd KhetiConnect
```

### 2. Set up the backend

Create and activate a Python virtual environment:

```bash
python3 -m venv .venv
source .venv/bin/activate
```

Install backend dependencies:

```bash
python -m pip install -r requirements.txt
```

Start the FastAPI development server:

```bash
uvicorn app.main:app --reload
```

The backend will be available at:

```text
http://127.0.0.1:8000
```

Open interactive API documentation at:

```text
http://127.0.0.1:8000/docs
```

### 3. Set up the frontend

Open a second terminal window. From the project root:

```bash
cd frontend
npm install
npm run dev
```

The Next.js frontend will be available at:

```text
http://localhost:3000
```

## Development Workflow

Run the backend and frontend in separate terminals.

### Terminal 1: Backend

```bash
cd KhetiConnect
source .venv/bin/activate
uvicorn app.main:app --reload
```

### Terminal 2: Frontend

```bash
cd KhetiConnect/frontend
npm run dev
```

Then open:

```text
http://localhost:3000
```

## Testing and Quality Checks

### Run backend tests

From the project root:

```bash
source .venv/bin/activate
pytest
```

### Run frontend linting

From the frontend directory:

```bash
cd frontend
npm run lint
```

### Create a production frontend build

From the frontend directory:

```bash
npm run build
```

## Main API Areas

The API is versioned under:

```text
/api/v1
```

| Area | Example endpoint |
|---|---|
| Farms | `GET /api/v1/farms` |
| Fields | `GET /api/v1/fields?farm_id=1` |
| Crops | `GET /api/v1/crops?farm_id=1` |
| Tasks | `GET /api/v1/tasks?farm_id=1` |
| Inventory | `GET /api/v1/inventory?farm_id=1` |
| Low-stock inventory | `GET /api/v1/inventory/low-stock` |
| Equipment | `GET /api/v1/equipment?farm_id=1` |
| Maintenance due | `GET /api/v1/equipment/maintenance-due` |
| Maintenance logs | `GET /api/v1/maintenance-logs?equipment_id=1` |
| Dashboard summary | `GET /api/v1/dashboard/summary?farm_id=1` |

Use the Swagger UI at `http://127.0.0.1:8000/docs` for complete request schemas, response schemas, and interactive endpoint testing.

## Current Status

KhetiConnect is a working MVP with:

- Full CRUD functionality for farms, fields, crops, tasks, inventory, equipment, and maintenance logs
- Farm-specific dashboard summaries
- Low-stock and maintenance-due alerts
- Responsive Next.js user interface
- Backend automated tests
- Frontend linting and production build validation

## Future Improvements

- User authentication and role-based access control
- Worker accounts and task assignment workflow
- PostgreSQL production configuration and database migrations
- Cloud deployment for the FastAPI API and Next.js application
- Weather integration and crop advisories
- File/image attachments for equipment and field records
- Exportable reports for inventory, tasks, crop planning, and maintenance history
- Additional automated tests for all CRUD routes and frontend interaction tests
- Accessibility enhancements and reusable shared layout components

## License

This project was created for academic and portfolio purposes.