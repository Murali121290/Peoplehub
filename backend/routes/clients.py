from flask import Blueprint, request, jsonify
from models.client import Client
from models.user import User
from middleware.auth import auth_required, access_level_required
from datetime import datetime
from models.database import db

clients_bp = Blueprint('clients', __name__)

@clients_bp.route('/', methods=['GET'])
@auth_required
def get_clients():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 20, type=int)
    search = request.args.get('search')
    category_filter = request.args.get('category')
    status_filter = request.args.get('status')
    
    query = Client.query
    
    if category_filter:
        query = query.filter_by(category=category_filter)
    
    if status_filter:
        query = query.filter_by(status=status_filter)
    
    if search:
        query = query.filter(
            Client.email.ilike(f'%{search}%') | 
            Client.company.ilike(f'%{search}%') |
            Client.vendor_number.ilike(f'%{search}%')
        )
    
    clients = query.paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'clients': [client.to_dict() for client in clients.items],
        'pagination': {
            'page': clients.page,
            'per_page': clients.per_page,
            'total': clients.total,
            'pages': clients.pages
        }
    }), 200

@clients_bp.route('/', methods=['POST'])
@auth_required
@access_level_required('admin')
def create_client():
    data = request.get_json()
    
    client = Client(
        category=data.get('category'),
        client_type=data.get('type'),
        email=data.get('email'),
        website=data.get('website'),
        designation=data.get('designation'),
        department=data.get('department'),
        division=data.get('division'),
        vendor_number=data.get('vendor_number'),
        address_line_1=data.get('address_line_1'),
        address_line_2=data.get('address_line_2'),
        country=data.get('country'),
        state=data.get('state'),
        city=data.get('city'),
        zip_code=data.get('zip_code'),
        working_hours=data.get('working_hours'),
        contact_hours=data.get('contact_hours'),
        sub_specialization=data.get('sub_specialization'),
        status=data.get('status', 'active')
    )
    
    from models.database import db
    db.session.add(client)
    db.session.commit()
    
    return jsonify({'client': client.to_dict(), 'message': 'Client created successfully'}), 201

@clients_bp.route('/<int:client_id>', methods=['PUT'])
@auth_required
@access_level_required('admin')
def update_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    data = request.get_json()
    
    for key, value in data.items():
        if hasattr(client, key):
            setattr(client, key, value)
    
    db.session.commit()
    
    return jsonify({'client': client.to_dict(), 'message': 'Client updated successfully'}), 200

@clients_bp.route('/<int:client_id>', methods=['DELETE'])
@auth_required
@access_level_required('admin')
def delete_client(client_id):
    client = Client.query.get(client_id)

    if not client:
        return jsonify({'error': 'Client not found'}), 404

    db.session.delete(client)
    db.session.commit()

    return jsonify({
        'message': 'Client deleted successfully'
    }), 200

@clients_bp.route('/<int:client_id>', methods=['GET'])
@auth_required
def get_client(client_id):
    client = Client.query.get(client_id)
    if not client:
        return jsonify({'error': 'Client not found'}), 404
    
    return jsonify({'client': client.to_dict()}), 200