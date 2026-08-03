from utils.compat import Blueprint, jsonify
from utils.jwt_helper import jwt_required, get_jwt_identity
from models.user import User
from models.database import engine, db
from sqlalchemy import inspect, text
from fastapi.encoders import jsonable_encoder

db_admin_bp = Blueprint('db_admin', __name__)

def check_is_admin():
    user_id = get_jwt_identity()
    user = User.query.get(int(user_id))
    if not user or not user.role or user.role.name.lower() not in ["admin"]:
        return False
    return True

@db_admin_bp.route("/tables", methods=["GET"])
@jwt_required()
def get_tables():
    if not check_is_admin():
        return jsonify({"success": False, "error": "Unauthorized. Admin access required."}), 403
        
    try:
        inspector = inspect(engine)
        tables = inspector.get_table_names()
        return jsonify({"success": True, "tables": tables}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@db_admin_bp.route("/tables/<table_name>", methods=["GET"])
@jwt_required()
def get_table_data(table_name):
    if not check_is_admin():
        return jsonify({"success": False, "error": "Unauthorized. Admin access required."}), 403
        
    try:
        inspector = inspect(engine)
        if table_name not in inspector.get_table_names():
            return jsonify({"success": False, "error": "Table not found."}), 404
            
        columns = [col['name'] for col in inspector.get_columns(table_name)]
        pk_columns = inspector.get_pk_constraint(table_name).get('constrained_columns', [])
        
        with engine.connect() as conn:
            result = conn.execute(text(f"SELECT * FROM {table_name} LIMIT 100"))
            rows = [dict(zip(columns, row)) for row in result.fetchall()]
            
        return jsonify({
            "success": True, 
            "table": table_name,
            "columns": columns,
            "pk_columns": pk_columns,
            "rows": jsonable_encoder(rows)
        }), 200
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": str(e)}), 500

@db_admin_bp.route("/tables/<table_name>/<id_val>", methods=["DELETE"])
@jwt_required()
def delete_row(table_name, id_val):
    if not check_is_admin():
        return jsonify({"success": False, "error": "Unauthorized. Admin access required."}), 403
        
    try:
        inspector = inspect(engine)
        if table_name not in inspector.get_table_names():
            return jsonify({"success": False, "error": "Table not found."}), 404
            
        pk_columns = inspector.get_pk_constraint(table_name).get('constrained_columns', [])
        if not pk_columns:
            return jsonify({"success": False, "error": "Table has no primary key. Cannot delete."}), 400
            
        pk_column = pk_columns[0]
        
        with engine.begin() as conn:
            conn.execute(
                text(f"DELETE FROM {table_name} WHERE {pk_column} = :id_val"), 
                {"id_val": id_val}
            )
            
        return jsonify({"success": True, "message": "Row deleted successfully."}), 200
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500
