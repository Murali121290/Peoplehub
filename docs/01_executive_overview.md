# PeopleHub: Executive Overview

## 1. System Vision & Business Value
PeopleHub is an enterprise-grade Human Resources Management System (HRMS) designed to centralize and automate core HR operations. Its primary business goals are to:
- **Centralize Employee Records:** Provide a single source of truth for all employee data, personal profiles, banking details, and documents (Aadhaar, PAN, Resume).
- **Automate Time & Attendance:** Enable real-time check-in, check-out, break tracking, and automated regularization request workflows, minimizing manual timesheet adjustments.
- **Streamline Leave Management:** Manage leave policies (Sick, Casual, Privilege) and balances dynamically, with approval workflows for managers.
- **Simplify Payroll Processing:** Store structural earnings and deductions fields and track salary payment states directly in the database.
- **Enable Real-Time Collaboration:** Deliver instant notifications, announcements, and direct messaging via WebSockets.
- **Enforce Security & Compliance:** Maintain granular Role-Based Access Control (RBAC) across three principal tiers: Admin/HR, Managers, and Employees.

## 2. Target User Personas
PeopleHub serves three primary classes of users, each with distinct operations and user interfaces:
- **Employees (Standard Users):** Apply for leaves, submit attendance check-ins, view personal payslips, access the telecom directory, and update profile completion details.
- **Managers:** Approve or reject team leaves, handle attendance regularization requests, conduct appraisals, and view dashboard analytics.
- **Admin / HR Personnel:** Manage the master employee directory, run payroll processes, customize leave policies, set holidays, broadcast system-wide announcements, and check system/database diagnostics.

## 3. Technology Stack Summary
PeopleHub leverages a modern, clean client-server architecture:

```
┌────────────────────────────────────────────────────────┐
│                        Frontend                        │
│            React 18 / TypeScript SPA (Vite)            │
│  State: Zustand | Styles: Tailwind CSS & Framer Motion │
└───────────────────────────┬────────────────────────────┘
                            │ REST / WebSockets
                            ▼
┌────────────────────────────────────────────────────────┐
│                        Backend                        │
│                   FastAPI (Python 3)                   │
│        Uvicorn / Python-Socket.IO compat server       │
└───────────────────────────┬────────────────────────────┘
                            │ SQLAlchemy ORM
                            ▼
┌────────────────────────────────────────────────────────┐
│                        Database                        │
│                       PostgreSQL                       │
│              Schema Migrations: Alembic                │
└────────────────────────────────────────────────────────┘
```

### Frontend Stack Details
- **Core Library:** React 18
- **Build System:** Vite & TypeScript (ensuring type safety and rapid builds)
- **State Management:** Zustand (for clean, lightweight global store state)
- **Styling:** Tailwind CSS (utility-first, responsive layouts)
- **Router:** React Router v6
- **Real-Time Client:** Socket.IO Client

### Backend Stack Details
- **Web Framework:** FastAPI (high-performance ASGI framework, automatic interactive Swagger UI)
- **Database Access:** SQLAlchemy ORM (Object-Relational Mapping)
- **Database Migrations:** Alembic
- **Real-Time Server:** python-socketio (running on Uvicorn server)
- **Task Scheduler:** APScheduler (BackgroundScheduler for periodic check-in/out tracking)

### Database Stack Details
- **Relational DBMS:** PostgreSQL (v14 or higher)
- **Data Drivers:** psycopg2-binary
