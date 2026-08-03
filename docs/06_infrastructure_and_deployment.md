# PeopleHub: Infrastructure & Deployment Guide

This document describes the environment setup, Docker configuration, file structures, database migrations, and dependency inventory for deploying PeopleHub.

## 1. System Requirements & Prerequisites
- **Docker & Docker Compose:** Containerized environment orchestration.
- **Node.js (v18+):** Required for building/testing the frontend application locally.
- **Python (v3.11+):** Backend development environment.
- **PostgreSQL (v14+):** Relational database (if deploying bare-metal).

---

## 2. Environment Configuration (`.env`)

Copy the `.env.example` in the root folder to `.env` and adjust the variables:

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `APP_ENV` | `local` | Application context (`local`, `staging`, `production`). |
| `TZ` | `UTC` | Target system timezone. |
| `BACKEND_PORT` | `5000` | Port exposed by the host for backend access. |
| `FRONTEND_PORT` | `5173` | Port exposed by the host for Nginx frontend access. |
| `SECRET_KEY` | `[min_32_chars]` | Flask/FastAPI session security sign key. |
| `JWT_SECRET_KEY` | `[min_32_chars]` | Key used for encrypting JWT auth signatures. |
| `DATABASE_URL` | `postgresql://...` | Connection credentials (host `postgres` in Docker). |
| `POSTGRES_DB` | `peoplehub_db` | PostgreSQL database instance name. |
| `POSTGRES_USER` | `postgres` | Database admin account name. |
| `CORS_ORIGINS` | `http://localhost:5173`| Allowed client origins for HTTP CORS middleware. |

---

## 3. Docker-Compose Architecture
The orchestration defines three coordinated services inside `docker-compose.yml`:

```
                    ┌─────────────────────────┐
                    │      Nginx (80)         │   (Frontend Host: 5173)
                    └───────────┬─────────────┘
                                │
        ┌───────────────────────┼────────────────────────┐
        │ /                     │ /api, /socket.io, /uploads
        ▼                       ▼                        ▼
┌───────────────┐       ┌────────────────┐       ┌───────────────┐
│ Frontend Dist │       │ FastAPI (5001) │       │ Postgres(5432)│ (Host: 5435)
└───────────────┘       └───────┬────────┘       └───────────────┘
                                │
                                ▼
                        [postgres_data Volume]
```

### 1. `postgres` (Database Tier)
- **Image:** `postgres:15-alpine`
- **Port:** Maps `5435` on the host to `5432` inside the container.
- **Volume:** `postgres_data` is mounted to `/var/lib/postgresql/data` for persistent storage.

### 2. `backend` (Web Server Tier)
- **Dockerfile target:** `backend` (Python 3.11 base image)
- **Port:** Maps `${BACKEND_PORT}` on the host to `5001` inside the container.
- **Volumes:** Mounts local `./backend` to `/app` inside the container to enable active code hot-reloading during development.
- **Command:** `uvicorn app:app --host 0.0.0.0 --port 5001 --proxy-headers --forwarded-allow-ips='*' --reload`

### 3. `frontend` (Static Web & Proxy Tier)
- **Image:** `nginx:alpine`
- **Port:** Maps `${FRONTEND_PORT}` on host to port `80` inside container.
- **Volume:**
  - Mounts `./frontend/dist` compiled React files to `/usr/share/nginx/html`.
  - Mounts `./frontend/nginx.conf` default configurations.
- **Nginx Proxy Directives (`nginx.conf`):**
  - `/api/` proxies to `http://backend:5001/api/`.
  - `/uploads/` proxies static assets to `http://backend:5001/uploads/`.
  - `/socket.io/` handles protocol negotiation and proxying to WebSocket listeners on the backend.
  - `/` falls back to `/index.html` to support React Router SPA client routes.

---

## 4. Database Migrations via Alembic
Database schema updates are managed incrementally using **Alembic**.

### Migration Workflow
1. **Initialize/Upgrade Head:** Runs automatically on backend boot (`init_db` in `app.py`). Alternatively, run manually in python context:
   ```bash
   alembic upgrade head
   ```
2. **Generating a New Migration:** When database models are modified in `models/*.py`, generate a migration script:
   ```bash
   alembic revision --autogenerate -m "description_of_change"
   ```
3. **Rollback Migration:** To roll back the last migration schema change:
   ```bash
   alembic downgrade -1
   ```

---

## 5. Dependency Inventory

### Backend Dependencies (`requirements.txt`)
- **FastAPI (0.111.0):** Core REST API framework.
- **Uvicorn (0.30.1):** ASGI HTTP server.
- **SQLAlchemy (2.0.29):** SQL Toolkit and ORM.
- **Alembic (1.13.1):** Database migrations tool.
- **psycopg2-binary (2.9.9):** PostgreSQL database driver.
- **python-socketio (5.11.4):** Asynchronous Socket.IO framework.
- **APScheduler (3.10.4):** Background task scheduler.
- **pyjwt (2.8.0):** JSON Web Token encryption.
- **reportlab (4.2.2):** PDF document rendering engine.
- **openpyxl (3.1.5) & xlrd (2.0.1):** Excel spreadsheet parsing.

### Frontend Dependencies (`package.json`)
- **React (18.2.0) & React-DOM (18.2.0):** Client library.
- **Vite (5.4.21):** Client bundler and bundler environment.
- **TypeScript (5.3.3):** Strongly typed script definition.
- **Tailwind CSS (3.4.19):** UI styling engine.
- **Zustand (4.5.7):** Client state management library.
- **React Router Dom (6.30.3):** SPA client side router.
- **Socket.io-Client (4.8.3):** Real-time communications protocol library.
- **Axios (1.16.1):** HTTP client.
- **Recharts (2.15.4):** Dynamic data visualization metrics.
- **jspdf (4.2.1) & jspdf-autotable (5.0.8):** Client-side PDF generation.
