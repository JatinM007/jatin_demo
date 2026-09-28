"""
Import and Seed Script for Dailoqa Interns Spreadsheet into PERFORMAX (EPMS)
Populates:
- Intern Users (email as login email, first name in lowercase as password)
- Employee Profiles (employee code, full name, batch/section, sub-batch/team)
- Teams for Sub-Batches (A1, A2, B1, B2, C1, C2, D1, D2)
- Departments for Batches (Batch A, Batch B, Batch C, Batch D)
- Goal and Appraisal mappings
"""

import os
import sys
import uuid
from decimal import Decimal
from datetime import date

import django

if __name__ == '__main__':
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.development')
    django.setup()

from apps.accounts.models import User, UserRole
from apps.organization.models import Department, Team, TeamMembership
from apps.employees.models import EmployeeProfile, EmploymentStatus

INTERNS_DATA = [
    {"section": "C", "sub_section": "C1", "name": "Tanvi Kad", "email": "tanvi.kad@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Jasleen Kaur", "email": "jasleen.kaur@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Ashish Rai", "email": "ashish.rai@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Manisha Parihar", "email": "manisha.parihar@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Aryan Sharma", "email": "aryan.sharma@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Prince Kumar", "email": "prince.kumar@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Maddirala Namitha Reddy", "email": "m.n.reddy@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Sourabh Pal", "email": "sourabh.pal@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Pandraju Ganya Srihitha", "email": "p.g.srihitha@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Akansha Attri", "email": "akansha.attri@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Akshat Bansal", "email": "akshat.bansal@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Vakkalagadda Naga Venkata Sai Lakshmi Kanishka", "email": "v.n.kanishka@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Aditya", "email": "aditya.Sen@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Jatin", "email": "jatin.maurya@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Bhavya Bhutani", "email": "bhavya.bhutani@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Krish Jain", "email": "krish.jain@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Sanka Maruthi Srujan", "email": "sanka.m.srujan@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Anushka Khare", "email": "anushka.khare@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Pramod", "email": "j.pramod@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Somepalli Ravi Teja", "email": "s.r.teja@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Siddhesh Nitin Chawande", "email": "s.n.chawande@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Aditya Yadav", "email": "aditya.yadav@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Saksham Gupta", "email": "saksham.gupta@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Jangeti Chaithanya Sai", "email": "j.c.sai@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "K.Sriram Naveen", "email": "k.s.naveen@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Khushal Nivas Gourishetty", "email": "khushal.n.g@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Talapanti Rajesh", "email": "talapanti.rajesh@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "somanadh mendu", "email": "m.v.somanadh@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Keshav Agarwal", "email": "keshav.agarwal@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Mayank Jain Malu", "email": "mayank.j.malu@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Akshat Awasthi", "email": "akshat.awasthi@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Divyom Agarwal", "email": "divyom.agarwal@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Ayush V Panicker", "email": "ayush.v.panicker@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Anshuman Mathur", "email": "anshuman.mathur@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Ayush Rai", "email": "ayush.rai@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Sarthak Shah", "email": "sarthak.shah@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Aakash Yadav", "email": "aakash.yadav@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Anushka Sharma", "email": "anushka.sharma@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Tanmay Garg", "email": "tanmay.garg@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Himanshu Gupta", "email": "himanshu.gupta@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Sameer Shukla", "email": "sameer.shukla@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Darsheel Jaiswal", "email": "darsheel.jaiswal@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Anant Sharma", "email": "anant.sharma@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Titirsha Singh", "email": "titirsha.singh@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Anshuman Mishra", "email": "anshuman.mishra@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Anant Vaibhav", "email": "anant.vaibhav@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Rudraraju Sriram Sathvik varma", "email": "rudraraju.s.varma@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Ananya Jain", "email": "ananya.jain@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Nikhil Bisla", "email": "nikhil.bisla@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Pradeep varma", "email": "penmetsa.h.varma@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Mann Upadhyay", "email": "mann.upadhyay@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Aditi Gupta", "email": "aditi.gupta@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Garvita Singh", "email": "garvita.singh@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Nitin singh", "email": "nitin.singh@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Pranav Suresh", "email": "pranav.suresh@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Rohit Raghav", "email": "rohit.raghav@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Kanak Varshney", "email": "kanak.varshney@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Bharat yadav", "email": "bharat.yadav@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Sridhar Reddy", "email": "k.s.reddy@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "Mahendra reddy", "email": "peram.m.reddy@dailoqa.com"},
    {"section": "B", "sub_section": "B1", "name": "sivaram saran", "email": "sivaram.s.alla@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Ansh Kukreti", "email": "ansh.kukreti@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Jatin Malik", "email": "jatin.malik@dailoqa.com"},
    {"section": "C", "sub_section": "C1", "name": "Keshav Gupta", "email": "keshav.gupta@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Deepanshu", "email": "deepanshu.dangi@dailoqa.com"},
    {"section": "B", "sub_section": "B2", "name": "Harsh Kumar", "email": "harsh.kumar@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Divyansh Agarwal", "email": "divyansh.agarwal@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Yash", "email": "Yash.tawar@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Arth Saxena", "email": "Arth.saxena@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Khushi Bainsla", "email": "khushi.bainsla@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Piyush Yadav", "email": "piyush.yadav@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Nitin Aman", "email": "nitin.aman@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Vaivashvat Upadhyay", "email": "vaivashvat.upadhyay@dailoqa.com"},
    {"section": "D", "sub_section": "D2", "name": "Athira Ravi Pillai", "email": "athira.r.pillai@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "D Anil Kumar", "email": "d.a.kumar@dailoqa.com"},
    {"section": "A", "sub_section": "A1", "name": "Yayivi Vinay", "email": "yayivi.vinay@dailoqa.com"},
    {"section": "A", "sub_section": "A2", "name": "Nikhil Sai Vamshi Krishna Manam", "email": "Nikhil.s.manam@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Saloni Rana", "email": "saloni.rana@dailoqa.com"},
    {"section": "D", "sub_section": "D1", "name": "Nishant Sindhu", "email": "nishant.sindhu@dailoqa.com"},
    {"section": "C", "sub_section": "C2", "name": "Jayesh kansal", "email": "jayesh.kansal@dailoqa.com"},
]


def import_dailoqa_interns():
    print(f"[*] Starting import of {len(INTERNS_DATA)} Dailoqa Interns...")


    # Get or create manager user to assign as default reporting manager
    manager_user = User.objects.filter(role=UserRole.MANAGER).first()
    if not manager_user:
        manager_user = User.objects.filter(role=UserRole.SUPER_ADMIN).first()

    # Create Departments for Batches A, B, C, D
    batch_departments = {}
    for batch_code in ["A", "B", "C", "D"]:
        dept_name = f"Batch {batch_code}"
        dept, _ = Department.objects.get_or_create(
            name=dept_name,
            defaults={"description": f"Dailoqa Interns Cohort - Batch {batch_code}"}
        )
        batch_departments[batch_code] = dept

    # Create Teams for Sub-Batches (A1, A2, B1, B2, C1, C2, D1, D2)
    sub_batch_teams = {}
    for item in INTERNS_DATA:
        sub = item["sub_section"].strip()
        batch = item["section"].strip() or (sub[0] if sub else "A")
        dept = batch_departments[batch]
        team_name = f"Sub-Batch {sub}"
        team, _ = Team.objects.get_or_create(
            department=dept,
            name=team_name,
            defaults={"description": f"Team for Sub-Batch {sub}", "manager": manager_user}
        )
        sub_batch_teams[sub] = team

    created_count = 0
    updated_count = 0

    for idx, intern in enumerate(INTERNS_DATA, start=1):
        raw_name = intern["name"].strip()
        email = intern["email"].strip().lower()
        sub_batch = intern["sub_section"].strip()
        batch = intern["section"].strip() or (sub_batch[0] if sub_batch else "A")

        # Name parts
        name_parts = raw_name.split()
        first_name = name_parts[0] if name_parts else "Intern"
        last_name = " ".join(name_parts[1:]) if len(name_parts) > 1 else ""

        # Password rule: first name in small letters
        # e.g., 'Tanvi' -> 'tanvi', 'Jasleen' -> 'jasleen'
        password = first_name.lower().strip()

        # Username from email prefix
        username_base = email.split('@')[0].replace('.', '_').lower()
        username = username_base

        dept = batch_departments.get(batch, batch_departments["A"])
        team = sub_batch_teams.get(sub_batch)
        emp_code = f"DLQ-{batch}{sub_batch}-{idx:03d}"

        # Create or update user
        user, user_created = User.objects.get_or_create(
            email=email,
            defaults={
                "username": username,
                "role": UserRole.INTERN,
                "is_active": True,
            }
        )

        # Set user's password to their first name in lowercase (temporary first-time credential)
        user.set_password(password)
        user.password_change_required = True
        user.save()


        # Create or update Employee Profile
        profile, prof_created = EmployeeProfile.objects.get_or_create(
            user=user,
            defaults={
                "employee_code": emp_code,
                "first_name": first_name,
                "last_name": last_name,
                "department": dept,
                "manager": manager_user,
                "designation": f"Software Intern ({sub_batch})",
                "joining_date": date(2025, 6, 1),
                "employment_status": EmploymentStatus.ACTIVE,
                "phone_number": "+91-9876543210",
            }
        )

        if not prof_created:
            profile.first_name = first_name
            profile.last_name = last_name
            profile.department = dept
            profile.designation = f"Software Intern ({sub_batch})"
            profile.save()

        # Add to Sub-Batch Team Membership
        if team:
            TeamMembership.objects.get_or_create(team=team, employee=profile)

        if user_created:
            created_count += 1
        else:
            updated_count += 1

        print(f"  [{idx}/{len(INTERNS_DATA)}] {raw_name:<35} | Email: {email:<30} | Pass: {password:<15} | Batch: {batch} ({sub_batch})")

    print("\n" + "=" * 80)
    print(f"[OK] Successfully processed all {len(INTERNS_DATA)} Interns!")
    print(f"   * Newly Created: {created_count}")
    print(f"   * Updated / Synced: {updated_count}")
    print(f"   * Password Pattern: First Name in lowercase (e.g. 'tanvi', 'jasleen', 'ashish', 'jatin')")
    print(f"   * Role: INTERN")
    print("=" * 80 + "\n")



if __name__ == '__main__':
    import_dailoqa_interns()
