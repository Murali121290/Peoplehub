from models.database import db
from datetime import datetime
from models.database import db

class RoomBooking(db.Model):
    __tablename__ = "room_bookings"

    id = db.Column(db.Integer, primary_key=True)

    booking_id = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    room_id = db.Column(
        db.Integer,
        db.ForeignKey("meeting_rooms.id"),
        nullable=False
    )

    meeting_title = db.Column(
        db.String(200),
        nullable=False
    )

    organizer_id = db.Column(db.Integer)

    organizer_name = db.Column(db.String(100))

    department = db.Column(db.String(100))

    meeting_date = db.Column(db.Date)

    start_time = db.Column(db.Time)
    end_time = db.Column(db.Time)

    attendees_count = db.Column(db.Integer)

    remarks = db.Column(db.Text)

    status = db.Column(
        db.String(20),
        default="Confirmed"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )