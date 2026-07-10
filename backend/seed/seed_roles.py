from models.database import db
from models.user import Role, Team


def seed_roles():
    """Create default roles if they don't already exist."""

    roles = [

        # -------------------------------
        # Project Management Team
        # -------------------------------
        ("Asst General Manager", "Project Management Team"),
        ("Senior Project Manager", "Project Management Team"),
        ("Project Manager", "Project Management Team"),
        ("Manuscript Analysis Operator", "Project Management Team"),

        # -------------------------------
        # Editorial Team
        # -------------------------------
        ("Editorial Manager", "Editorial Team"),
        ("Team Lead - Editorial", "Editorial Team"),
        ("Copyeditor", "Editorial Team"),
        ("Technical Editor", "Editorial Team"),
        ("Pre Editor", "Editorial Team"),

        # -------------------------------
        # Production Team
        # -------------------------------
        ("Production Manager", "Production Team"),
        ("Team Lead - Production", "Production Team"),
        ("Senior Compositor", "Production Team"),
        ("Compositor", "Production Team"),
        ("Senior Quality Controller", "Production Team"),
        ("Quality Controller", "Production Team"),

        # -------------------------------
        # Template Team
        # -------------------------------
        ("Template Team Manager", "Template Team"),
        ("Template Designer", "Template Team"),

        # -------------------------------
        # Graphics Team
        # -------------------------------
        ("Graphics Manager", "Graphics Team"),
        ("Senior Graphics Designer", "Graphics Team"),
        ("Graphics Designer", "Graphics Team"),

        # -------------------------------
        # XML Conversion Team
        # -------------------------------
        ("XML Manager", "XML Conversion Team"),
        ("Senior XML Operator", "XML Conversion Team"),
        ("XML Operator", "XML Conversion Team"),

        # -------------------------------
        # Non XML Team
        # -------------------------------
        ("Non-XML Manager", "Non-XML Conversion Team"),
        ("Senior Non-XML Operator", "Non-XML Conversion Team"),
        ("Non-XML Operator", "Non-XML Conversion Team"),

        # -------------------------------
        # Accessibility Team
        # -------------------------------
        ("Team Lead - Accessibility", "Accessibility Team"),
        ("Accessibility Specialist", "Accessibility Team"),

        # -------------------------------
        # Index Team
        # -------------------------------
        ("Index Manager", "Index Team"),
        ("Index Operator", "Index Team"),
    ]

    for role_name, team_name in roles:

        team = Team.query.filter_by(
            name=team_name
        ).first()

        if not team:
            print(f"❌ Team '{team_name}' not found.")
            continue

        role = Role.query.filter_by(
            name=role_name
        ).first()

        if not role:
            db.session.add(
                Role(
                    name=role_name,
                    description="",
                    team_id=team.id
                )
            )

    db.session.commit()

    print("✅ Roles seeded successfully.")