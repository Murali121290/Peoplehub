from models.database import db
from models.user import Team


def seed_teams():
    """Create default teams if they don't already exist."""

    teams = [
        {
            "name": "Project Management Team",
            "workflow_stage": "Project Management"
        },
        {
            "name": "Editorial Team",
            "workflow_stage": "Editorial"
        },
        {
            "name": "Production Team",
            "workflow_stage": "Production"
        },
        {
            "name": "Template Team",
            "workflow_stage": "Template"
        },
        {
            "name": "Graphics Team",
            "workflow_stage": "Graphics"
        },
        {
            "name": "XML Conversion Team",
            "workflow_stage": "XML Conversion"
        },
        {
            "name": "Non-XML Conversion Team",
            "workflow_stage": "Non-XML Conversion"
        },
        {
            "name": "Accessibility Team",
            "workflow_stage": "Accessibility"
        },
        {
            "name": "Index Team",
            "workflow_stage": "Index"
        }
    ]

    for team_data in teams:

        team = Team.query.filter_by(
            name=team_data["name"]
        ).first()

        if not team:
            db.session.add(
                Team(
                    name=team_data["name"],
                    description="",
                    workflow_stage=team_data["workflow_stage"]
                )
            )

    db.session.commit()

    print("✅ Teams seeded successfully.")