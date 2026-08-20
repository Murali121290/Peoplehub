import os
import urllib.parse
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Date, Float, LargeBinary, extract, Time, Numeric, text, JSON, Index
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

engine = create_engine(
    DATABASE_URL,
    pool_size=50,
    max_overflow=50,
    pool_recycle=300,
    pool_pre_ping=True
)
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
    Index = Index
    session = db_session
    extract = extract

db = DbMock

def init_db(app=None):
    """Initialize database and create tables if they do not exist"""
    Base.metadata.create_all(bind=engine)

    # Ensure status, deactivation_reason and last_working_date columns exist in PostgreSQL
    try:
        with engine.connect() as conn:
            conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE"))
            conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS deactivation_reason TEXT"))
            conn.execute(text("ALTER TABLE employees ADD COLUMN IF NOT EXISTS last_working_date DATE"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS regularization_check_in TIMESTAMP"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS regularization_check_out TIMESTAMP"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS regularization_total_hours FLOAT DEFAULT 0.0"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS is_paused BOOLEAN DEFAULT FALSE"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS paused_start TIMESTAMP"))
            conn.execute(text("ALTER TABLE attendance ADD COLUMN IF NOT EXISTS paused_minutes INTEGER DEFAULT 0"))
            conn.commit()
    except Exception as dberr:
        print(f"Error checking/adding employee status columns: {dberr}")

    # Apply Alembic migrations before querying tables, so the schema
    # (e.g. columns added in later migrations) matches the ORM models.
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command
        alembic_cfg = AlembicConfig("alembic.ini")
        alembic_command.upgrade(alembic_cfg, "head")
        
        # Regularize employee_id in payment_details from internal PK to employee_id code
        try:
            with engine.connect() as conn:
                conn.execute(text("""
                    UPDATE payment_details
                    SET employee_id = e.employee_id
                    FROM employees e
                    WHERE payment_details.employee_id ~ '^[0-9]+$' AND payment_details.employee_id::integer = e.id
                """))
                conn.commit()
        except Exception as data_err:
            print(f"Error regularizing payment_details employee_id: {data_err}")
    except Exception as e:
        print(f"Error running Alembic migrations: {e}")



    # Initialize EmployeeLeaveBalance for all existing employees
    from models.employee import Employee
    from models.leave import LeavePolicy, EmployeeLeaveBalance

    employees = db_session.query(Employee).all()
    policies = db_session.query(LeavePolicy).all()
    existing_balances = {
        (b.employee_id, (b.leave_type or "").strip().lower())
        for b in db_session.query(EmployeeLeaveBalance).all()
    }

    for emp in employees:
        for pol in policies:
            emp_gender = (emp.gender or "").strip().lower()
            pol_gender = (pol.applicable_gender or "All").strip().lower()
            is_applicable = (pol_gender == "all") or (emp_gender == pol_gender)

            pol_lt_normalized = (pol.leave_type or "").strip().lower()
            if is_applicable and (emp.id, pol_lt_normalized) not in existing_balances:
                balance = EmployeeLeaveBalance(
                    employee_id=emp.id,
                    leave_type=pol.leave_type.strip(),
                    available=pol.yearly_limit
                )
                db_session.add(balance)
                existing_balances.add((emp.id, pol_lt_normalized))
    db_session.commit()

    return db
