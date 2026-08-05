import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv()

# Import models & database
from models.database import init_db, engine, db_session
# pyrefly: ignore [missing-import]
from sqlalchemy import text

# Import routers
from routes.auth import auth_bp
from routes.users import users_bp
from routes.employees import employees_bp
from routes.attendance import attendance_bp
from routes.leaves import leave_bp
from routes.notifications import notification_bp
from routes.telecom import telecom_bp
from routes.performance import performance_bp
from routes.birthday_wishes import birthday_wishes_bp
from routes.shift_request import shift_bp
from routes.employee_details import employee_details_bp
from routes.requests import requests_bp
from routes.payroll_routes import payroll_bp
from routes.work_anniversary import work_anniversary_bp
from routes.communications import communication_bp
from routes.appraisal_routes import appraisal_bp
from routes.meeting_rooms import meeting_rooms_bp
from routes.holidays import holidays_bp
from routes.db_admin import db_admin_bp

# Import Socket.IO and register events
from extensions import socketio
from socket_events import register_socket_events
from services.checkin_monitor import check_missed_checkins, generate_daily_notifications

def create_app():
    fastapi_app = FastAPI(title="Peoplehub API", version="1.0.0")

    # Configure CORS
    allowed_origins = os.environ.get("CORS_ORIGINS", "http://localhost:5555,http://localhost:3000").split(",")
    fastapi_app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )

    # Scoped session cleanup middleware
    @fastapi_app.middleware("http")
    async def db_session_middleware(request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        finally:
            db_session.remove()

    @fastapi_app.middleware("http")
    async def force_https_middleware(request: Request, call_next):
        host = request.headers.get("host", "")
        proto = request.headers.get("x-forwarded-proto", "")
        if proto == "https" or ("localhost" not in host and "127.0.0.1" not in host):
            request.scope["scheme"] = "https"
        return await call_next(request)

    # Register blueprints (routers)
    fastapi_app.include_router(employees_bp, prefix="/api/employees")
    fastapi_app.include_router(meeting_rooms_bp, prefix="/api/meeting-rooms")
    fastapi_app.include_router(attendance_bp, prefix="/api/attendance")
    fastapi_app.include_router(leave_bp, prefix="/api/leaves")
    fastapi_app.include_router(notification_bp, prefix="/api/notifications")
    fastapi_app.include_router(telecom_bp, prefix="/api/telecom")
    fastapi_app.include_router(performance_bp, prefix="/api/performance")
    fastapi_app.include_router(birthday_wishes_bp, prefix="/api/birthday-wishes")
    fastapi_app.include_router(shift_bp, prefix="/api/shifts")
    fastapi_app.include_router(employee_details_bp, prefix="/api")
    fastapi_app.include_router(holidays_bp, prefix="/api")
    fastapi_app.include_router(requests_bp, prefix="/api/requests")
    fastapi_app.include_router(payroll_bp, prefix="/api/payroll")
    fastapi_app.include_router(work_anniversary_bp)
    fastapi_app.include_router(auth_bp, prefix="/api/auth")
    fastapi_app.include_router(users_bp, prefix="/api/users")
    fastapi_app.include_router(communication_bp, prefix="/api/communications")
    fastapi_app.include_router(appraisal_bp, prefix="/api")
    fastapi_app.include_router(db_admin_bp, prefix="/api/admin/db")

    # Mount uploads directory static files
    os.makedirs("uploads", exist_ok=True)
    fastapi_app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

    # Initialize database, apply Alembic migrations, and seed defaults
    init_db()

    # Scheduler configuration
    scheduler = BackgroundScheduler()
    def run_checkin_monitor():
        check_missed_checkins()

    scheduler.add_job(
        run_checkin_monitor,
        "interval",
        minutes=1
    )
    scheduler.add_job(
        generate_daily_notifications,
        "cron",
        hour=0,
        minute=0
    )
    scheduler.start()

    # Health check
    @fastapi_app.get('/api/health')
    def health_check():
        return {
            'status': 'healthy',
            'message': 'Peoplehub API is running'
        }

    # Initialize Socket.IO connection
    socketio.init_app(fastapi_app)
    register_socket_events(socketio)

    return fastapi_app

# Instantiate API App for Uvicorn
fastapi_app = create_app()
app = socketio.asgi_app
