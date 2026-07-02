from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from sqlalchemy import text
from dotenv import load_dotenv
from routes.payroll_routes import payroll_bp
import os
from flask import send_from_directory
from flask_socketio import (
    SocketIO
)

from socket_events import (
    register_socket_events
)

from apscheduler.schedulers.background import (
    BackgroundScheduler
)

from services.checkin_monitor import (
    check_missed_checkins
)

from extensions import socketio
from seed.seed_teams import seed_teams
from seed.seed_roles import seed_roles
from seed.seed_users import seed_users

load_dotenv()

from config.config import Config
from models.database import db, init_db
from middleware.auth import auth_required, role_required
from routes.auth import auth_bp
from routes.users import users_bp
from routes.clients import clients_bp
from routes.projects import projects_bp
from routes.workflow import workflow_bp
from routes.dashboard import dashboard_bp
from routes.employees import employees_bp
from routes.attendance import attendance_bp
from routes.leaves import leave_bp
from routes.communications import communication_bp
from models.shift_request import ShiftRequest
from routes.shift_request import shift_bp
from routes.employee_details import employee_details_bp
from routes.notifications import (
    notification_bp
)
from routes.meeting_rooms import meeting_rooms_bp
from routes.telecom import telecom_bp
from seed.seed_employees import seed_employees
from seed.seed_telecom import seed_telecom

def create_app():
    app = Flask(__name__)

    socketio.init_app(app)


    CORS(
    app,
    resources={r"/api/*": {"origins": "*"}},
    supports_credentials=True
)

    # Disable strict slash redirects
    app.url_map.strict_slashes = False

    # Configuration
    app.config.from_object(Config)

    # Enable CORS
    app.register_blueprint(
    employees_bp,
    url_prefix="/api/employees"
)
    

    app.register_blueprint(
    meeting_rooms_bp,
    url_prefix="/api/meeting-rooms"
)
    app.register_blueprint(
    attendance_bp,
    url_prefix="/api/attendance"
)
    app.register_blueprint(
    leave_bp,
    url_prefix="/api/leaves"
)
    app.register_blueprint(
    notification_bp,
    url_prefix="/api/notifications"
)
    app.register_blueprint(
    telecom_bp,
    url_prefix="/api/telecom"
)
    
    app.register_blueprint(
    shift_bp,
    url_prefix="/api/shifts"
)
    app.register_blueprint(
    employee_details_bp,
    url_prefix="/api"
)
    app.register_blueprint(
    payroll_bp,
    url_prefix="/api/payroll"
)
    


    # JWT
    jwt = JWTManager(app)

    # Initialize database
    init_db(app)

    with app.app_context():
        db.create_all()

        # db.create_all() only creates missing tables, it never alters
        # existing ones, so columns added to a model after the table
        # already existed in a deployed database need to be patched in here.
        db.session.execute(text(
            "ALTER TABLE telecom_directory "
            "ADD COLUMN IF NOT EXISTS designation VARCHAR(150), "
            "ADD COLUMN IF NOT EXISTS location VARCHAR(100)"
        ))
        db.session.commit()

        seed_teams()
        seed_roles()
        seed_users()
        seed_employees()
        seed_telecom()
        

    # Check missed check-ins every minute

    scheduler = BackgroundScheduler()

    def run_checkin_monitor():
       with app.app_context():
        check_missed_checkins()

    scheduler.add_job(
    run_checkin_monitor,
    "interval",
    minutes=1
)
    

    scheduler.start()

    # Register blueprints
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(users_bp, url_prefix='/api/users')
    app.register_blueprint(clients_bp, url_prefix='/api/clients')
    app.register_blueprint(projects_bp, url_prefix='/api/projects')
    app.register_blueprint(workflow_bp, url_prefix='/api/workflow')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(
    communication_bp,
    url_prefix="/api/communications"
)

    # Health check
    @app.route('/api/health')
    def health_check():
        return jsonify({
            'status': 'healthy',
            'message': 'WMS API is running'
        })

    # 404 Error
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({
            'error': 'Endpoint not found'
        }), 404

    @app.route('/uploads/<path:filename>')
    def uploaded_file(filename):
        return send_from_directory(
        os.path.join(os.getcwd(), 'uploads'),
        filename
    )

    # 500 Error
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({
            'error': 'Internal server error'
        }), 500
        
    print(app.url_map)

    register_socket_events(
    socketio
)


    return app, socketio


if __name__ == '__main__':

    app, socketio = create_app()

    socketio.run(
        app,
        host="0.0.0.0",
        port=5000,
        debug=True,
        allow_unsafe_werkzeug=True
    )
