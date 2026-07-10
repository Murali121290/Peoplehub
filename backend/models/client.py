from .database import db
from datetime import datetime

class Client(db.Model):
    __tablename__ = 'clients'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # Basic Information
    category = db.Column(db.String(100))
    client_type = db.Column(db.String(50))
    email = db.Column(db.String(300))
    website = db.Column(db.String(300))
    designation = db.Column(db.String(100))
    department = db.Column(db.String(100))
    division = db.Column(db.String(100))
    vendor_number = db.Column(db.String(50))
    
    # Address
    address_line_1 = db.Column(db.String(500))
    address_line_2 = db.Column(db.String(500))
    country = db.Column(db.String(100))
    state = db.Column(db.String(100))
    city = db.Column(db.String(100))
    zip_code = db.Column(db.String(20))
    
    # Hours
    working_hours = db.Column(db.String(100))
    contact_hours = db.Column(db.String(100))
    sub_specialization = db.Column(db.String(200))
    
    # Metadata
    status = db.Column(db.String(20), default='active')
    project_count = db.Column(db.Integer, default=0)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    projects = db.relationship('Project', backref='client', lazy=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'category': self.category,
            'client_type': self.client_type,
            'email': self.email,
            'website': self.website,
            'designation': self.designation,
            'department': self.department,
            'division': self.division,
            'vendor_number': self.vendor_number,
            'address_line_1': self.address_line_1,
            'address_line_2': self.address_line_2,
            'country': self.country,
            'state': self.state,
            'city': self.city,
            'zip_code': self.zip_code,
            'working_hours': self.working_hours,
            'contact_hours': self.contact_hours,
            'sub_specialization': self.sub_specialization,
            'status': self.status,
            'project_count': self.project_count,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat()
        }