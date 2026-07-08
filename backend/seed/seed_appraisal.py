from datetime import date

from models.database import db
from models.appraisal import (
    AppraisalCycle,
    AppraisalQuestion
)


def seed_appraisal():

    print("Seeding Appraisal Data...")

    # ---------------------------------------------------
    # Create Appraisal Cycle
    # ---------------------------------------------------

    cycle = AppraisalCycle.query.filter_by(
        appraisal_year=2026
    ).first()

    if not cycle:

        cycle = AppraisalCycle(
            title="2026 Annual Appraisal",
            appraisal_year=2026,
            start_date=date(2026, 1, 1),
            end_date=date(2026, 12, 31),
            status="Open"
        )

        db.session.add(cycle)

    # ---------------------------------------------------
    # Default Questions
    # ---------------------------------------------------

    questions = {

        "Production": [

            "How many projects or chapters did you complete during this appraisal period?",

            "How did you maintain quality while meeting deadlines?",

            "Describe a challenge you faced and how you solved it.",

            "How did you contribute to your team's success?",

            "Which skill would you like to improve next year?"

        ],

        "Editor": [

            "How did you improve document quality this year?",

            "How do you ensure grammar and formatting accuracy?",

            "Describe an editing challenge you successfully resolved.",

            "How do you manage multiple editing deadlines?",

            "Which editing skill would you like to improve?"

        ],

        "Copywriter": [

            "How do you ensure your content meets client expectations?",

            "Describe your best content delivered this year.",

            "How do you handle client revisions?",

            "How do you improve writing quality before submission?",

            "Which writing skill would you like to improve?"

        ]
    }

    # ---------------------------------------------------
    # Insert Questions
    # ---------------------------------------------------

    for role, question_list in questions.items():

        for question in question_list:

            exists = AppraisalQuestion.query.filter_by(
                appraisal_year=2026,
                role_name=role,
                question=question
            ).first()

            if not exists:

                db.session.add(

                    AppraisalQuestion(

                        appraisal_year=2026,

                        role_name=role,

                        question=question,

                        is_active=True

                    )

                )

    db.session.commit()

    print("Appraisal Seed Completed Successfully.")