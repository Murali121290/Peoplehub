from models.database import db

class Holiday(db.Model):
    __tablename__ = "holidays"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    date = db.Column(db.Date, nullable=False, unique=True)
    day = db.Column(db.String(50), nullable=False)
    holiday_type = db.Column(db.String(100), nullable=False) # e.g. "National Holiday", "Festival Holiday", "Company Holiday", "Weekly Off"
    is_published = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "day": self.day,
            "holiday_type": self.holiday_type,
            "is_published": self.is_published
        }

class HolidayOverride(db.Model):
    __tablename__ = "holiday_overrides"

    id = db.Column(db.Integer, primary_key=True)
    date = db.Column(db.Date, nullable=False, unique=True)
    override_type = db.Column(db.String(50), nullable=False) # "Working Day" or "Holiday"
    name = db.Column(db.String(200), nullable=True) # e.g. "Manual Working Day" or "Special Holiday"
    holiday_type = db.Column(db.String(100), nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "date": self.date.strftime("%Y-%m-%d") if self.date else None,
            "override_type": self.override_type,
            "name": self.name,
            "holiday_type": self.holiday_type
        }
