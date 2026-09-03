import os
import time
from datetime import datetime
from utils.compat import Blueprint, request, jsonify, Response
from models.database import db
from models.hr_document import HRDocument
from utils.uploads import ensure_upload_dir, get_upload_path

hr_documents_bp = Blueprint("hr_documents", __name__)

def format_file_size(size_bytes):
    if size_bytes < 1024:
        return f"{size_bytes} B"
    elif size_bytes < 1024 * 1024:
        return f"{round(size_bytes / 1024, 1)} KB"
    else:
        return f"{round(size_bytes / (1024 * 1024), 1)} MB"

@hr_documents_bp.route("/", methods=["GET"])
def get_all_documents():
    try:
        docs = HRDocument.query.order_by(HRDocument.created_at.desc()).all()
        return jsonify([d.to_dict() for d in docs])
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@hr_documents_bp.route("/upload", methods=["POST"])
def upload_document():
    try:
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"error": "No file uploaded"}), 400

        title = request.form.get("title") or file.filename
        category = request.form.get("category") or "Policy"
        uploaded_by = request.form.get("uploaded_by") or "HR Department"

        # Ensure directory exists inside persistent uploads volume
        target_dir = ensure_upload_dir("hr_documents")

        # Sanitize filename and create unique target filename
        safe_filename = "".join([c for c in file.filename if c.isalnum() or c in (".", "_", "-")])
        timestamp = int(time.time())
        target_filename = f"{timestamp}_{safe_filename}"
        target_path = os.path.join(target_dir, target_filename)

        # Read file contents and write to disk
        file_bytes = file.read()
        file_size = format_file_size(len(file_bytes))

        with open(target_path, "wb") as f:
            f.write(file_bytes)

        # Relative DB path
        db_path = f"hr_documents/{target_filename}"

        doc = HRDocument(
            title=title,
            category=category,
            filename=file.filename,
            file_path=db_path,
            file_size=file_size,
            uploaded_by=uploaded_by,
            created_at=datetime.utcnow()
        )
        db.session.add(doc)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Document uploaded successfully",
            "document": doc.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@hr_documents_bp.route("/view/<int:doc_id>", methods=["GET"])
def view_document(doc_id):
    return _serve_document(doc_id, disposition="inline")

@hr_documents_bp.route("/download/<int:doc_id>", methods=["GET"])
def download_document(doc_id):
    return _serve_document(doc_id, disposition="attachment")

def _serve_document(doc_id, disposition="attachment"):
    try:
        doc = HRDocument.query.get(doc_id)
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        full_path = get_upload_path(doc.file_path)
        if not os.path.exists(full_path):
            return jsonify({"error": "File not found on disk"}), 404

        with open(full_path, "rb") as f:
            file_data = f.read()

        filename = doc.filename or os.path.basename(full_path)
        ext = os.path.splitext(filename)[1].lower()

        mimetype = "application/octet-stream"
        if ext == ".pdf":
            mimetype = "application/pdf"
        elif ext in (".png", ".jpg", ".jpeg"):
            mimetype = f"image/{ext.replace('.', '')}"
        elif ext == ".xlsx":
            mimetype = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        elif ext == ".docx":
            mimetype = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        elif ext == ".zip":
            mimetype = "application/zip"

        disp_header = f'inline; filename="{filename}"' if disposition == "inline" else f'attachment; filename="{filename}"'

        return Response(
            file_data,
            mimetype=mimetype,
            headers={
                "Content-Disposition": disp_header
            }
        )
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@hr_documents_bp.route("/<int:doc_id>", methods=["DELETE"])
def delete_document(doc_id):
    try:
        doc = HRDocument.query.get(doc_id)
        if not doc:
            return jsonify({"error": "Document not found"}), 404

        # Delete file from disk if it exists
        full_path = get_upload_path(doc.file_path)
        if os.path.exists(full_path):
            try:
                os.remove(full_path)
            except Exception as pe:
                print("Failed to remove file from disk:", pe)

        db.session.delete(doc)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Document deleted successfully"
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
