from models.database import db
from datetime import datetime
from models.database import db

class MeetingRoom(db.Model):
    __tablename__ = "meeting_rooms"

    id = db.Column(db.Integer, primary_key=True)

    room_name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(100))
    floor = db.Column(db.String(50))

    capacity = db.Column(db.Integer)
    room_type = db.Column(db.String(50))

    projector = db.Column(db.Boolean, default=False)
    tv = db.Column(db.Boolean, default=False)
    whiteboard = db.Column(db.Boolean, default=False)
    video_conference = db.Column(db.Boolean, default=False)

    status = db.Column(db.String(20), default="Available")

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )