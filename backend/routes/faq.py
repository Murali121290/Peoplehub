from utils.compat import Blueprint, request, jsonify
from models.database import db
from models.faq import FAQCustomItem
from datetime import datetime

faq_bp = Blueprint("faq", __name__)


# ── GET all active custom FAQ items (accessible to all logged-in users) ──────
@faq_bp.route("/", methods=["GET"])
def get_faq_items():
    try:
        items = (
            FAQCustomItem.query
            .filter_by(is_active=True)
            .order_by(FAQCustomItem.created_at.desc())
            .all()
        )
        return jsonify([
            {
                "id": item.id,
                "question": item.question,
                "answer": item.answer,
                "category": item.category,
                "created_by": item.created_by,
                "created_at": item.created_at.isoformat() if item.created_at else None,
            }
            for item in items
        ])
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ── POST create a new custom FAQ item (HR only) ───────────────────────────────
@faq_bp.route("/", methods=["POST"])
def create_faq_item():
    try:
        data = request.json or {}
        question = (data.get("question") or "").strip()
        answer = (data.get("answer") or "").strip()
        category = (data.get("category") or "support").strip()
        created_by = (data.get("created_by") or "HR Team").strip()

        if not question or not answer:
            return jsonify({"error": "Question and answer are required."}), 400

        item = FAQCustomItem(
            question=question,
            answer=answer,
            category=category,
            created_by=created_by,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
            is_active=True,
        )
        db.session.add(item)
        db.session.commit()

        return jsonify({
            "id": item.id,
            "question": item.question,
            "answer": item.answer,
            "category": item.category,
            "created_by": item.created_by,
            "created_at": item.created_at.isoformat() if item.created_at else None,
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── DELETE a custom FAQ item (HR only) ───────────────────────────────────────
@faq_bp.route("/<int:item_id>", methods=["DELETE"])
def delete_faq_item(item_id: int):
    try:
        item = FAQCustomItem.query.get(item_id)
        if not item:
            return jsonify({"error": "FAQ item not found."}), 404
        item.is_active = False
        db.session.commit()
        return jsonify({"success": True})
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# ── PUT update a custom FAQ item (HR only) ───────────────────────────────────
@faq_bp.route("/<int:item_id>", methods=["PUT"])
def update_faq_item(item_id: int):
    try:
        item = FAQCustomItem.query.get(item_id)
        if not item:
            return jsonify({"error": "FAQ item not found."}), 404

        data = request.json or {}
        question = data.get("question")
        answer = data.get("answer")
        category = data.get("category")

        if question is not None:
            item.question = question.strip()
        if answer is not None:
            item.answer = answer.strip()
        if category is not None:
            item.category = category.strip()

        item.updated_at = datetime.utcnow()
        db.session.commit()

        return jsonify({
            "id": item.id,
            "question": item.question,
            "answer": item.answer,
            "category": item.category,
            "created_by": item.created_by,
        })
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

