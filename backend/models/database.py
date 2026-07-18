import os
from sqlalchemy import create_engine, Column, Integer, String, DateTime, Boolean, Text, ForeignKey, Date, Float, LargeBinary, extract, Time, Numeric
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship, scoped_session, backref

DATABASE_URL = os.environ.get('DATABASE_URL')
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

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