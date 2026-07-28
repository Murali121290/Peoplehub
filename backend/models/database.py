import os
import urllib.parse
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Date, Float, LargeBinary, extract, Time, Numeric, text, JSON
# pyrefly: ignore [missing-import]
from sqlalchemy.ext.declarative import declarative_base
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker, relationship, scoped_session, backref

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

def create_database_if_not_exists(url):
    try:
        parsed = urllib.parse.urlparse(url)
        dbname = parsed.path.lstrip('/')
        if not dbname:
            return
        postgres_url = urllib.parse.urlunparse(parsed._replace(path='/postgres'))
        temp_engine = create_engine(postgres_url, isolation_level="AUTOCOMMIT")
        with temp_engine.connect() as conn:
            exists = conn.execute(text("SELECT 1 FROM pg_database WHERE datname = :dbname"), {"dbname": dbname}).scalar()
            if not exists:
                conn.execute(text(f"CREATE DATABASE {dbname}"))
                print(f"Database '{dbname}' created successfully.")
        temp_engine.dispose()
    except Exception as e:
        print(f"Error checking or creating database: {e}")

create_database_if_not_exists(DATABASE_URL)

engine = create_engine(DATABASE_URL)
db_session = scoped_session(sessionmaker(autocommit=False, autoflush=False, bind=engine))

Base = declarative_base()
Base.query = db_session.query_property()

class DbMock:
    Model = Base
    Column = Column
    Integer = Integer
    String = String
    DateTime = DateTime
    Boolean = Boolean
    Text = Text
    ForeignKey = ForeignKey
    Date = Date
    Float = Float
    LargeBinary = LargeBinary
    relationship = relationship
    backref = backref
    Time = Time
    Numeric = Numeric
    JSON = JSON
    session = db_session
    extract = extract

db = DbMock

def init_db(app=None):
    """Initialize database and create tables if they do not exist"""
    Base.metadata.create_all(bind=engine)

    # Apply Alembic migrations before querying tables, so the schema
    # (e.g. columns added in later migrations) matches the ORM models.
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_command.upgrade(alembic_cfg, "head")
    except Exception as e:
        print(f"Error running Alembic migrations: {e}")

    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS clarification_history JSONB DEFAULT '[]'::jsonb;"))
            conn.execute(text("ALTER TABLE attendance ALTER COLUMN manager_status TYPE VARCHAR(100);"))
            conn.commit()
    except Exception as col_err:
        print(f"Migration check rejection_reason: {col_err}")

    # Seed default policies
    from models.leave import LeavePolicy
    defaults = [
        ("Sick Leave", 0.0),
        ("Casual Leave", 0.0),
        ("Privilege Leave", 0.0)
    ]
    for leave_type, limit in defaults:
        policy = db_session.query(LeavePolicy).filter_by(leave_type=leave_type).first()
        if not policy:
            policy = LeavePolicy(leave_type=leave_type, yearly_limit=limit, applicable_gender="All")
            db_session.add(policy)
    db_session.commit()

    # Initialize EmployeeLeaveBalance for all existing employees
    from models.employee import Employee
    from models.leave import EmployeeLeaveBalance
    
    employees = db_session.query(Employee).all()
    policies = db_session.query(LeavePolicy).all()
    
    for emp in employees:
        emp.sick_leave = 0.0
        emp.casual_leave = 0.0
        emp.privilege_leave = 0.0

        for pol in policies:
            emp_gender = (emp.gender or "").strip().lower()
            pol_gender = (pol.applicable_gender or "All").strip().lower()
            is_applicable = (pol_gender == "all") or (emp_gender == pol_gender)

            if is_applicable:
                balance = db_session.query(EmployeeLeaveBalance).filter_by(employee_id=emp.id, leave_type=pol.leave_type).first()
                if not balance:
                    balance = EmployeeLeaveBalance(
                        employee_id=emp.id,
                        leave_type=pol.leave_type,
                        available=pol.yearly_limit
                    )
                    db_session.add(balance)
    db_session.commit()

    return db
