from flask import Blueprint, request, jsonify
from models.project import Project, ProjectChapter, ProjectAssignment
from models.workflow import WorkflowStage, WorkflowHistory
from models.user import User, Role
from models.tracking import SLATracking
from middleware.auth import auth_required, role_required
from flask_jwt_extended import get_jwt_identity
from datetime import datetime, timedelta
from werkzeug.utils import secure_filename
import os
import zipfile
import json
from models.database import db
from models.project import Project
from models.project import ProjectAssignment

from models.database import db

projects_bp = Blueprint('projects', __name__)

UPLOAD_FOLDER = "uploads"

os.makedirs(
    UPLOAD_FOLDER,
    exist_ok=True
)


# =========================================================
# GET PROJECTS
# =========================================================

@projects_bp.route('/', methods=['GET'])
@auth_required
def get_projects():

    try:

        user = User.query.get(int(get_jwt_identity()))

        if not user:
            return jsonify({
                'error': 'User not found'
            }), 404

        if not user.role:
            return jsonify({
                'error': 'Role not assigned'
            }), 403

        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)

        status_filter = request.args.get('status')
        stage_filter = request.args.get('stage')

        query = Project.query

        # Role-based filtering
        if user.role.name not in [
            'Admin',
            'Super Admin',
            'Project Manager'
        ]:

            assignments = ProjectAssignment.query.filter_by(
                assigned_user_id=user.id
            ).all()

            project_ids = [a.project_id for a in assignments]

            query = query.filter(
                Project.id.in_(project_ids)
            )

        if status_filter:
            query = query.filter_by(
                status=status_filter
            )

        if stage_filter:
            query = query.filter_by(
                current_stage=stage_filter
            )

        projects = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )

        return jsonify({
            'projects': [
    {
        **p.to_dict(),

        "chapters": [
    {
        "id": chapter.id,
        "chapter_title": chapter.chapter_title,
        "file_name": chapter.file_name,
        "file_path": chapter.file_path,
        "status": chapter.status,
    }
    for chapter in ProjectChapter.query.filter_by(
        project_id=p.id
    ).all()
]
    }
    for p in projects.items
],
            'pagination': {
                'page': projects.page,
                'per_page': projects.per_page,
                'total': projects.total,
                'pages': projects.pages
            }
        }), 200

    except Exception as e:

        print("PROJECT ERROR:", str(e))

        return jsonify({
            'error': str(e)
        }), 422


# =========================================================
# CREATE PROJECT
# =========================================================

@projects_bp.route('/', methods=['POST'])
@auth_required
@role_required('Project Manager', 'Admin', 'Super Admin')
def create_project():

    try:

        data = request.get_json()
        print("NEW CODE RUNNING")

        project = Project(
            project_code=data['project_code'],
            customer=data.get('customer'),
            customer_name=data.get('customer_name'),
            customer_contact=data.get('customer_contact'),
            division_code=data.get('division_code'),
            billing_location=data.get('billing_location'),
            category=data.get('category'),
            sales_person=data.get('sales_person'),
            project_title=data['project_title'],
            priority=data.get('priority', 'medium'),
            complexity=data.get('complexity', 'normal'),
            edition=data.get('edition'),
            color=data.get('color'),
            trim_size=data.get('trim_size'),
            copyright_year=data.get('copyright_year'),
            manuscript_pages=data.get('manuscript_pages'),
            estimated_pages=data.get('estimated_pages'),
            actual_pages=data.get('actual_pages'),
            isbn_number=data.get('isbn_number'),
            xml_standard=data.get('xml_standard'),
            workflow_id=data.get('workflow_id', 1),
            current_stage='draft',
            status='draft',
            creator_id=int(get_jwt_identity()),
            client_id=data.get('client_id')
        )

        db.session.add(project)
        db.session.commit()

        return jsonify({
            'message': 'Project created successfully',
            'project': project.to_dict()
        }), 201

    except Exception as e:

        db.session.rollback()

        print("CREATE PROJECT ERROR:", str(e))

        return jsonify({
            'error': str(e)
        }), 422
    



# =========================================================
# ACTIVATE PROJECT
# =========================================================

@projects_bp.route('/<int:project_id>/activate', methods=['POST'])
@auth_required
def activate_project(project_id):

    try:

        data = request.get_json()

        workflow_id = data.get("workflow_id")

        print("WORKFLOW ID RECEIVED:", workflow_id)

        project = Project.query.get(project_id)

        if not project:
            return jsonify({
                "error": "Project not found"
            }), 404

        if not workflow_id:
            return jsonify({
                "error": "Please select workflow"
            }), 400

        project.workflow_id = workflow_id
        project.is_active = True
        project.status = "active"

        first_stage = WorkflowStage.query.filter_by(
            workflow_id=workflow_id,
            order=1
        ).first()

        if first_stage:

            project.current_stage = first_stage.name

            # Assign to Pre-Editing User
            from models.user import User
            from models.project import ProjectAssignment

            pre_editor = User.query.join(Role).filter(
    Role.name == "Pre-Editing"
).first()

            if pre_editor:

                assignment = ProjectAssignment(
                    project_id=project.id,
                    assigned_user_id=pre_editor.id,
                    workflow_stage=first_stage.name,
                    status="assigned"
                )

                db.session.add(assignment)

        project.activated_at = datetime.utcnow()

        db.session.commit()

        return jsonify({
            "message": "Project Activated Successfully",
            "project": project.to_dict()
        }), 200

    except Exception as e:

        db.session.rollback()

        print("ACTIVATE ERROR:", str(e))

        return jsonify({
            "error": str(e)
        }), 422





@projects_bp.route('/<int:project_id>/deactivate', methods=['POST'])
@auth_required
def deactivate_project(project_id):

    project = Project.query.get(project_id)

    if not project:
        return jsonify({
            "error": "Project not found"
        }), 404

    project.is_active = False

    db.session.commit()

    return jsonify({
        "message": "Project Deactivated Successfully",
        "project": project.to_dict()
    }), 200



    

# =========================================================
# ASSIGN USER
# =========================================================

def assign_to_user(project, workflow_stage):

    required_role = workflow_stage.required_role_id

    users = User.query.filter_by(
        role_id=required_role,
        is_active=True
    ).all()

    if not users:
        raise Exception(
            f"No users found for role {workflow_stage.name}"
        )

    user_workloads = []

    for user in users:

        active_assignments = ProjectAssignment.query.filter_by(
            assigned_user_id=user.id,
            status='in_progress'
        ).count()

        user_workloads.append(
            (user, active_assignments)
        )

    user_workloads.sort(key=lambda x: x[1])

    return user_workloads[0][0]


@projects_bp.route('/parse-zip', methods=['POST'])
@auth_required
def parse_zip():

    try:

        if 'zip_file' not in request.files:
            return jsonify({
                'error': 'No ZIP file uploaded'
            }), 400

        file = request.files['zip_file']

        temp_folder = 'uploads/temp'

        os.makedirs(temp_folder, exist_ok=True)

        temp_zip = os.path.join(
            temp_folder,
            secure_filename(file.filename)
        )

        file.save(temp_zip)

        chapters = []

        with zipfile.ZipFile(temp_zip, 'r') as zip_ref:

            for filename in zip_ref.namelist():

                if not filename.endswith('/'):
                    chapters.append({
    'file_name': filename,
    'chapter_title': filename.rsplit('.', 1)[0],
    'chapter_order': len(chapters) + 1,
    'file_size': 0
})

        # os.remove(temp_zip)

        return jsonify({
            'chapters': chapters,
            'count': len(chapters)
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()

    return jsonify({
        'error': str(e)
    }), 422
import json
from flask import request, jsonify
from middleware.auth import auth_required
from models.database import db
from models.project import Project

@projects_bp.route('/create-with-chapters', methods=['POST'])
@auth_required
def create_project_with_chapters():

    try:

        payload = json.loads(request.form.get('payload'))
        zip_file = request.files.get('zip_file')

        project_data = payload.get("project", {})
        book_data = payload.get("book_details", {})

        # Create Project
        project = Project(
            project_code=project_data.get("project_code"),
            customer=project_data.get("customer"),
            customer_name=project_data.get("customer_name"),
            customer_contact=project_data.get("customer_contact"),
            division_code=project_data.get("division_code"),
            billing_location=project_data.get("billing_location"),
            category=project_data.get("category"),
            sales_person=project_data.get("sales_person"),
            project_title=project_data.get("project_title"),
            priority=project_data.get("priority", "medium"),
            complexity=project_data.get("complexity", "normal"),

            edition=book_data.get("edition"),
            color=book_data.get("color"),
            trim_size=book_data.get("trim_size"),
            copyright_year=book_data.get("copyright_year"),
            manuscript_pages=book_data.get("manuscript_pages"),
            estimated_pages=book_data.get("estimated_pages"),
            actual_pages=book_data.get("actual_pages"),
            isbn_number=book_data.get("isbn_number"),
            xml_standard=book_data.get("xml_standard"),

            workflow_id=None,
            client_id=project_data.get("client_id"),

            creator_id=int(get_jwt_identity()),
            current_stage="Pre-Editing",
            status="draft"
        )

        db.session.add(project)
        db.session.commit()

        print("PROJECT SAVED:", project.id)

        # ==========================
        # Save ZIP File
        # ==========================

        if zip_file:

            upload_path = os.path.join(
                "uploads",
                project.project_code
            )

            os.makedirs(upload_path, exist_ok=True)

            zip_path = os.path.join(
                upload_path,
                secure_filename(zip_file.filename)
            )

            zip_file.save(zip_path)

            chapters_dir = os.path.join(
                upload_path,
                "chapters"
            )

            os.makedirs(chapters_dir, exist_ok=True)

            with zipfile.ZipFile(zip_path, "r") as zip_ref:
                zip_ref.extractall(chapters_dir)

            chapter_files = [
                f for f in os.listdir(chapters_dir)
                if os.path.isfile(
                    os.path.join(chapters_dir, f)
                )
            ]

            for idx, chapter_file in enumerate(chapter_files, start=1):

                chapter = ProjectChapter(
                    project_id=project.id,
                    chapter_number=idx,
                    chapter_title=os.path.splitext(chapter_file)[0],
                    file_name=chapter_file,
                    file_path=os.path.join(
                        chapters_dir,
                        chapter_file
                    ),
                    file_size=os.path.getsize(
                        os.path.join(
                            chapters_dir,
                            chapter_file
                        )
                    ),
                    status="pending"
                )

                db.session.add(chapter)

            db.session.commit()

            print(f"{len(chapter_files)} Chapters Saved")

        return jsonify({
            "message": "Project created successfully",
            "project_id": project.id
        }), 200

    except Exception as e:

        import traceback
        traceback.print_exc()

        db.session.rollback()

        return jsonify({
            "error": str(e)
        }), 500

    


# =========================================================
# UPLOAD CHAPTERS
# =========================================================

@projects_bp.route('/<int:project_id>/chapters/upload', methods=['POST'])
@auth_required
@role_required('Project Manager', 'Admin', 'Super Admin')
def upload_chapters(project_id):

    try:

        project = Project.query.get(project_id)

        if not project:
            return jsonify({
                'error': 'Project not found'
            }), 404

        if 'zip_file' not in request.files:
            return jsonify({
                'error': 'No file uploaded'
            }), 400

        file = request.files['zip_file']

        if file.filename == '':
            return jsonify({
                'error': 'No file selected'
            }), 400

        filename = secure_filename(file.filename)

        BASE_UPLOAD_FOLDER = "uploads"

        upload_path = os.path.join(
            BASE_UPLOAD_FOLDER,
            project.project_code
     )

        os.makedirs(upload_path, exist_ok=True)

        file_path = os.path.join(
            upload_path,
            filename
        )

        file.save(file_path)

        chapters_dir = os.path.join(
            upload_path,
            'chapters'
        )

        os.makedirs(chapters_dir, exist_ok=True)

        with zipfile.ZipFile(file_path, 'r') as zip_ref:
            zip_ref.extractall(chapters_dir)

        chapter_files = [
            f for f in os.listdir(chapters_dir)
            if os.path.isfile(os.path.join(chapters_dir, f))
        ]

        for idx, chapter_file in enumerate(chapter_files, 1):

            chapter = ProjectChapter(
                project_id=project.id,
                chapter_number=idx,
                chapter_title=f'Chapter {idx}',
                file_name=chapter_file,
                file_path=os.path.join(chapters_dir, chapter_file),
                file_size=os.path.getsize(
                    os.path.join(chapters_dir, chapter_file)
                ),
                status='pending'
            )

            db.session.add(chapter)

        db.session.commit()

        return jsonify({
            'message': 'Chapters uploaded successfully',
            'chapter_count': len(chapter_files)
        }), 200

    except Exception as e:

        db.session.rollback()

        print("UPLOAD ERROR:", str(e))

        return jsonify({
            'error': str(e)
        }), 422