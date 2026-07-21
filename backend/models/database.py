import os
import urllib.parse
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Date, Float, LargeBinary, extract, Time, Numeric, text
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
    session = db_session
    extract = extract

db = DbMock

def init_db(app=None):
    """Initialize database and create tables if they do not exist"""
    Base.metadata.create_all(bind=engine)
    return db
