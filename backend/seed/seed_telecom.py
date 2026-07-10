from models.database import db
from models.telecom import TelecomDirectory

def seed_telecom():

    # Prevent duplicate data
    if TelecomDirectory.query.first():
        print("Telecom data already exists.")
        return

    telecoms = [
        TelecomDirectory(
    department_name="Management",
    team_name="CEO",
    employee_name="Kris Srinaath",
    extension_number="123",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Management",
    team_name="COO",
    employee_name="Nandakumar R",
    extension_number="124",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Management",
    team_name="EA - CEO",
    employee_name="Jayashree Muthuramaswami",
    extension_number="122",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Administration",
    team_name="Manager Admin",
    employee_name="Sujatha Nair",
    extension_number="125",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Administration",
    team_name="Front Office",
    employee_name="Reception",
    extension_number="111/112",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Administration",
    team_name="Pantry",
    employee_name="Shanmugam",
    extension_number="201",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Conference Room",
    team_name="Conference Room",
    employee_name="Conference Room",
    extension_number="129",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Finance Team",
    team_name="Accounts Manager",
    employee_name="Joseph Amalraj A",
    extension_number="118",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Finance Team",
    team_name="Asst.Manager Accounts",
    employee_name="Dilli Babu R",
    extension_number="119",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="HR Team",
    team_name="HR Executive",
    employee_name="Hari",
    extension_number="120",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Billing",
    team_name="Production Manager",
    employee_name="Mehalinga Kumar",
    extension_number="145",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Software Developer",
    employee_name="Harini / Charuthi",
    extension_number="144",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Accessibility Engineer",
    employee_name="Gayathiri / Sindhu",
    extension_number="142",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Trainee Software Developer",
    employee_name="Ashwin / Rosy",
    extension_number="141",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Trainee Software Developer",
    employee_name="Salomi Ricy / Jayashree",
    extension_number="140",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="General Manager",
    employee_name="Sakthivel V",
    extension_number="126",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Software Developer",
    employee_name="Yogeshwari",
    extension_number="147",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Software Developer",
    employee_name="Kanimozhi",
    extension_number="146",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Qbend & Media Team",
    team_name="Associate Software Engineer",
    employee_name="Shankar",
    extension_number="143",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="GM - Editorial/Manager Automation",
    employee_name="Muthukumar/Murali",
    extension_number="121",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="Team Leader",
    employee_name="Sangeetha A",
    extension_number="130",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="Technical Editor",
    employee_name="Manikaraj",
    extension_number="131",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="Senior Team Leader",
    employee_name="Vigneshwaramoorthy S",
    extension_number="134",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="Dy. Manager",
    employee_name="Srinivasan",
    extension_number="135",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Editorial Team",
    team_name="Manager - Indexing Services",
    employee_name="Umasangeetha",
    extension_number="137",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="IT Team",
    team_name="System Admin",
    employee_name="Sulthan",
    extension_number="132",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="IT Team",
    team_name="IT Team",
    employee_name="IT Support",
    extension_number="133",
    location="Ground Floor - Right Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Accessible / Data Team",
    team_name="Senior Manager / Team Lead",
    employee_name="Saravanan E / Amutha",
    extension_number="113",
    location="Ground Floor - Left Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Accessible / Data Team",
    team_name="Automation Specialist / Conversition",
    employee_name="Ilayaraja P / Gopi",
    extension_number="114",
    location="Ground Floor - Left Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Accessible / Data Team",
    team_name="Business Development Manager",
    employee_name="Muralidharan P",
    extension_number="115",
    location="Ground Floor - Left Wing",
    status="Active"
),

TelecomDirectory(
    department_name="Conference Room",
    team_name="Conference Room",
    employee_name="Conference Room",
    extension_number="117",
    location="Ground Floor - Left Wing",
    status="Active"
),

TelecomDirectory(
    department_name="WK/Tech Team",
    team_name="Account Manager",
    employee_name="Ravindran",
    extension_number="151",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="WK/Tech Team",
    team_name="Senior Compositor",
    employee_name="Raj Sekar",
    extension_number="152",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="WK/Tech Team",
    team_name="Sr.Project Manager",
    employee_name="Udhayakumar M M",
    extension_number="153",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="WK/Tech Team",
    team_name="Production Manager - Composition",
    employee_name="Parthasarathy G",
    extension_number="154",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="AGM-Project Management Services",
    employee_name="Ann Mary Francis",
    extension_number="160",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="Senior Account Manager / Team Lead",
    employee_name="Bharathi Sanjeev / Shyam",
    extension_number="155",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="Senior Project Manager",
    employee_name="Annie Christine / Veerakumar",
    extension_number="156",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="PPD Team",
    employee_name="Gowri / Anbazhagan",
    extension_number="157",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="Sr.Account Manager / Project Manager",
    employee_name="Nandini / John",
    extension_number="159",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="Account Manager / Project Manager",
    employee_name="Latha / Revathi",
    extension_number="158",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="Project Management Team",
    team_name="Account Manager",
    employee_name="Bhavani",
    extension_number="162",
    location="First Floor - Old Space",
    status="Active"
),

TelecomDirectory(
    department_name="WKH Team",
    team_name="Quality Controller",
    employee_name="Gokula Sri / Sarathy",
    extension_number="180",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="WKH Team",
    team_name="Compositor",
    employee_name="Saranya / Alvin",
    extension_number="179",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="WKH Team",
    team_name="Compositor / Team Lead",
    employee_name="Iyyappan / Karuna",
    extension_number="177",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="WKH Team",
    team_name="Senior Quality Controller",
    employee_name="Ganesh / Venkat",
    extension_number="178",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="JBL Team",
    team_name="Lead - Design / Team Lead - Comp",
    employee_name="Mathan / Sathiya",
    extension_number="175",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="JBL Team",
    team_name="Production Manager",
    employee_name="Vinoth",
    extension_number="186",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="JBL Team",
    team_name="Sr.Compositor / Compositor",
    employee_name="Arputharaj / Anitha",
    extension_number="176",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="JBL Team",
    team_name="Quality Controller",
    employee_name="Amudha / Kowsalya",
    extension_number="174",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="ART Team",
    team_name="Graphic Designer / Quality Lead",
    employee_name="Samson / Barani",
    extension_number="171",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="ART Team",
    team_name="Graphic Designer",
    employee_name="Elakiya / Sumesh Raj",
    extension_number="173",
    location="First Floor - New Space",
    status="Active"
),

TelecomDirectory(
    department_name="ART Team",
    team_name="Graphic Designer",
    employee_name="Praveen",
    extension_number="172",
    location="First Floor - New Space",
    status="Active"
),
    ]


    db.session.add_all(telecoms)
    db.session.commit()

    print("Telecom data seeded successfully.")