import os
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
# pyrefly: ignore [missing-import]
from apscheduler.schedulers.background import BackgroundScheduler
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

# Import models & database
from models.database import init_db, engine, db_session
# pyrefly: ignore [missing-import]
from sqlalchemy import text
from utils.uploads import get_uploads_dir, ensure_upload_dir

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

    # Sync route handlers run in AnyIO's worker threadpool (see
    # utils/compat.py's make_compat_wrapper) so match its cap to the DB
    # connection pool's total capacity (pool_size + max_overflow) - otherwise
    # requests queue behind the thread limit before ever reaching the DB pool.
    @fastapi_app.on_event("startup")
    async def _raise_threadpool_limit():
        import anyio
        import asyncio
        anyio.to_thread.current_default_thread_limiter().total_tokens = 100
        socketio.main_loop = asyncio.get_running_loop()


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

    # Mount uploads directory static files (persistent Docker volume at UPLOADS_DIR)
    uploads_dir = get_uploads_dir()
    ensure_upload_dir()  # ensure base dir exists
    ensure_upload_dir("shift_requests")  # pre-create subdirs
    ensure_upload_dir("employees")
    fastapi_app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

    # Initialize database, apply Alembic migrations, and seed defaults
    init_db()

    # Scheduler configuration
    # Guard: only run background scheduler in ONE worker process when using --workers N.
    # We use a lock file approach: the first worker to acquire the lock starts the scheduler.
    import fcntl
    _scheduler_lock_file = "/tmp/peoplehub_scheduler.lock"
    _lock_fd = None
    _is_scheduler_worker = False
    try:
        _lock_fd = open(_scheduler_lock_file, "w")
        fcntl.flock(_lock_fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        _is_scheduler_worker = True
    except (IOError, OSError):
        _is_scheduler_worker = False

    if _is_scheduler_worker:
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

        # Auto-credit leaves on the 25th of every month at 00:01 AM
        def run_monthly_leave_credit():
            from services.leave_balance_service import update_all_employee_leave_balances
            try:
                result = update_all_employee_leave_balances()
                print(f"[Scheduler] Monthly leave credit: {result}")
            except Exception as e:
                print(f"[Scheduler] Monthly leave credit error: {e}")

        scheduler.add_job(
            run_monthly_leave_credit,
            "cron",
            day=25,
            hour=0,
            minute=1
        )

        # Auto-reset permissions on the 25th of every month at 00:01 AM
        def run_monthly_permission_reset():
            from services.leave_balance_service import update_all_employee_permission_balances
            try:
                result = update_all_employee_permission_balances()
                print(f"[Scheduler] Monthly permission reset: {result}")
            except Exception as e:
                print(f"[Scheduler] Monthly permission reset error: {e}")

        scheduler.add_job(
            run_monthly_permission_reset,
            "cron",
            day=25,
            hour=0,
            minute=1
        )

        # Auto-credit PL on Jan 1st at 00:01 AM
        def run_yearly_pl_credit():
            from services.leave_balance_service import update_all_employee_pl_balances
            try:
                result = update_all_employee_pl_balances()
                print(f"[Scheduler] Yearly PL credit: {result}")
            except Exception as e:
                print(f"[Scheduler] Yearly PL credit error: {e}")

        scheduler.add_job(
            run_yearly_pl_credit,
            "cron",
            month=1,
            day=1,
            hour=0,
            minute=1
        )

        scheduler.start()
        print(f"[Scheduler] Started in worker PID {os.getpid()}")
    else:
        print(f"[Scheduler] Skipped in worker PID {os.getpid()} (already running in another worker)")


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
