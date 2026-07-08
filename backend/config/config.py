import os
from datetime import timedelta

class Config:
    # Flask Secret Key
    SECRET_KEY = os.environ.get(
        'SECRET_KEY',
        'wms-enterprise-secret-key-2024'
    )

    # Database Configuration
    # Password: $vBr@2150
    SQLALCHEMY_DATABASE_URI = os.environ.get(
        'DATABASE_URL',
        'postgresql://postgres:$vBr%402150@localhost:5432/wms_db'
    )

    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # JWT Configuration
    JWT_SECRET_KEY = os.environ.get(
    'JWT_SECRET_KEY',
    'wms-enterprise-super-secret-jwt-key-2026-secure'
)

    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)

    # Mail Configuration
    MAIL_SERVER = os.environ.get(
        'MAIL_SERVER',
        'smtp.gmail.com'
    )

    MAIL_PORT = int(
        os.environ.get('MAIL_PORT', 587)
    )

    MAIL_USE_TLS = True

    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')

    MAIL_DEFAULT_SENDER = os.environ.get(
        'MAIL_DEFAULT_SENDER',
        'wms@publishing.com'
    )

    # Upload Configuration
    BASE_DIR = os.path.abspath(os.path.dirname(__file__))

    UPLOAD_FOLDER = os.path.join(
        BASE_DIR,
        '..',
        'uploads'
    )

    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500MB

    ALLOWED_EXTENSIONS = {
        'zip',
        'pdf',
        'doc',
        'docx'
    }

    # EmailJS Configuration
    EMAILJS_SERVICE_ID = os.environ.get(
        'EMAILJS_SERVICE_ID',
        'your_service_id'
    )

    EMAILJS_TEMPLATE_ID = os.environ.get(
        'EMAILJS_TEMPLATE_ID',
        'your_template_id'
    )

    EMAILJS_PUBLIC_KEY = os.environ.get(
        'EMAILJS_PUBLIC_KEY',
        'your_public_key'
    )

    # SLA Configuration
    SLA_PRE_EDITING = 48
    SLA_COPYWRITING = 72
    SLA_PROOFREADING = 24
    SLA_QA = 24
    SLA_FINAL_DELIVERY = 12