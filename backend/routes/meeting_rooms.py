from flask import Blueprint, request, jsonify
from models.database import db
from datetime import datetime
import uuid

from models.meeting_room import MeetingRoom
from models.room_booking import RoomBooking

meeting_rooms_bp = Blueprint(
    "meeting_rooms",
    __name__
)

@meeting_rooms_bp.route(
    "/rooms",
    methods=["POST"]
)
def create_room():

    data = request.json

    room = MeetingRoom(
        room_name=data["room_name"],
        location=data["location"],
        floor=data["floor"],
        capacity=data["capacity"],
        room_type=data["room_type"],
        projector=data.get("projector", False),
        tv=data.get("tv", False),
        whiteboard=data.get("whiteboard", False),
        video_conference=data.get(
            "video_conference",
            False
        )
    )

    db.session.add(room)
    db.session.commit()

    return jsonify({
        "message": "Room created successfully"
    }), 201

@meeting_rooms_bp.route("/rooms", methods=["GET"])
def get_rooms():
    try:
        rooms = MeetingRoom.query.all()

        result = []

        for room in rooms:
            result.append({
                "id": room.id,
                "name": room.room_name,
                "room_name": room.room_name,
                "location": room.location,
                "floor": room.floor,
                "capacity": room.capacity,
                "status": room.status
            })

        return jsonify(result), 200

    except Exception as e:
        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@meeting_rooms_bp.route("/bookings", methods=["POST"])
def create_booking():
    try:
        data = request.get_json()

        print("BOOKING REQUEST:", data)

        room_id = int(data["room_id"])

        room = MeetingRoom.query.get(room_id)

        if not room:
            return jsonify({
                "success": False,
                "message": "Room not found"
            }), 404

        meeting_date = datetime.strptime(
            data["meeting_date"],
            "%Y-%m-%d"
        ).date()

        from datetime import date

        if meeting_date < date.today():
            return jsonify({
                "success": False,
                "message": "Past dates are not allowed"
            }), 400

        start_time = datetime.strptime(
            data["start_time"],
            "%H:%M"
        ).time()

        end_time = datetime.strptime(
            data["end_time"],
            "%H:%M"
        ).time()

        if start_time >= end_time:
            return jsonify({
                "success": False,
                "message": "End time must be greater than start time"
            }), 400

        overlap = RoomBooking.query.filter(
            RoomBooking.room_id == room_id,
            RoomBooking.meeting_date == meeting_date,
            RoomBooking.status == "Confirmed",
            RoomBooking.start_time < end_time,
            RoomBooking.end_time > start_time
        ).first()

        if overlap:

            available_rooms = MeetingRoom.query.filter(
                MeetingRoom.id != room_id
            ).all()

            suggestions = []

            for room in available_rooms:

                room_overlap = RoomBooking.query.filter(
                    RoomBooking.room_id == room.id,
                    RoomBooking.meeting_date == meeting_date,
                    RoomBooking.status == "Confirmed",
                    RoomBooking.start_time < end_time,
                    RoomBooking.end_time > start_time
                ).first()

                if not room_overlap:
                    suggestions.append({
                        "id": room.id,
                        "room_name": room.room_name
                    })

            return jsonify({
                "success": False,
                "message": "Selected room is already booked",
                "available_rooms": suggestions
            }), 400

        booking = RoomBooking(
            booking_id=str(uuid.uuid4())[:8],
            room_id=room_id,
            meeting_title=data["meeting_title"],
            organizer_name=data["organizer_name"],
            department=data["department"],
            meeting_date=meeting_date,
            start_time=start_time,
            end_time=end_time,
            attendees_count=int(data["attendees_count"]),
            remarks=data.get("remarks", "")
        )

        db.session.add(booking)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Booking created successfully"
        }), 201

    except Exception as e:

        db.session.rollback()

        print("BOOKING ERROR:", str(e))

        return jsonify({
            "success": False,
            "message": str(e)
        }), 500

@meeting_rooms_bp.route(
    "/bookings",
    methods=["GET"]
)
def get_bookings():

    bookings = RoomBooking.query.all()

    result = []

    for booking in bookings:

        result.append({
            "id": booking.id,
            "booking_id": booking.booking_id,
            "meeting_title": booking.meeting_title,
            "organizer_name": booking.organizer_name,
            "department": booking.department,
            "meeting_date": str(
                booking.meeting_date
            ),
            "start_time": str(
                booking.start_time
            ),
            "end_time": str(
                booking.end_time
            ),
            "status": booking.status
        })

    return jsonify(result)

@meeting_rooms_bp.route(
    "/bookings/<int:id>/cancel",
    methods=["PUT"]
)
def cancel_booking(id):

    booking = RoomBooking.query.get_or_404(id)

    booking.status = "Cancelled"

    db.session.commit()

    return jsonify({
        "message": "Booking cancelled"
    })

@meeting_rooms_bp.route(
    "/dashboard-stats",
    methods=["GET"]
)
def dashboard_stats():

    total_rooms = MeetingRoom.query.count()

    available_rooms = MeetingRoom.query.filter_by(
        status="Available"
    ).count()

    booked_today = RoomBooking.query.filter(
        RoomBooking.meeting_date == datetime.today().date(),
        RoomBooking.status == "Confirmed"
    ).count()

    pending = RoomBooking.query.filter_by(
        status="Pending"
    ).count()

    utilization = 0

    if total_rooms > 0:
        utilization = round(
            (booked_today / total_rooms) * 100,
            2
        )

    return jsonify({
        "total_rooms": total_rooms,
        "available_rooms": available_rooms,
        "booked_today": booked_today,
        "pending": pending,
        "utilization": utilization
    })

