from datetime import date
from models.room_booking import RoomBooking
from models.database import db

def complete_old_bookings():
    try:
        bookings = RoomBooking.query.filter(
            RoomBooking.meeting_date < date.today(),
            RoomBooking.status == "Confirmed"
        ).all()

        for booking in bookings:
            booking.status = "Completed"

        db.session.commit()
        print("Meeting rooms refreshed")
    except Exception as e:
        db.session.rollback()
        print(f"Error completing old bookings: {e}")
    finally:
        try:
            db.session.remove()
        except Exception as dbe:
            print(f"Error removing db session: {dbe}")