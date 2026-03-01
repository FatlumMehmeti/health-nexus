from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from datetime import datetime, timezone, timedelta

from app.auth.auth_utils import hash_password
from app.db import SessionLocal
from app.models import (
    Font,
    BrandPalette,
    Product,
    SubscriptionPlan,
    Role,
    Tenant,
    TenantStatus,
    User,
    Department,
    TenantDepartment,
    TenantManager,
    Doctor,
    Service,
    TenantSubscription,
)


ROLE_NAMES = [
    "SUPER_ADMIN",
    "TENANT_MANAGER",
    "DOCTOR",
    "SALES",
    "CLIENT",
]


@dataclass(frozen=True)
class SeedUser:
    first_name: str
    last_name: str
    email: str
    password: str
    role_name: str


SEED_USERS = [
    SeedUser("Super", "Admin", "super.admin@seed.com", "Team2026@", "SUPER_ADMIN"),
    SeedUser("Tenant", "Manager", "tenant.manager@seed.com", "Team2026@", "TENANT_MANAGER"),
    SeedUser("Doctor", "One", "doctor.one@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Two", "doctor.two@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Three", "doctor.three@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Four", "doctor.four@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Five", "doctor.five@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Six", "doctor.six@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Seven", "doctor.seven@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Eight", "doctor.eight@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Nine", "doctor.nine@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Doctor", "Ten", "doctor.ten@seed.com", "Team2026@", "DOCTOR"),
    SeedUser("Sales", "Agent", "sales.agent@seed.com", "Team2026@", "SALES"),
    SeedUser("Client", "User", "client.user@seed.com", "Team2026@", "CLIENT"),
]


SEED_TENANTS = [
    # Approved
    {"name": "Bluestone Clinic", "slug": "bluestone-clinic", "email": "contact@bluestone.com", "licence_number": "BLU-001", "status": TenantStatus.approved},
    {"name": "Riverside Health Partners", "slug": "riverside-health-partners", "email": "contact@riverside.com", "licence_number": "RIV-002", "status": TenantStatus.approved},
    {"name": "Apex Medical Group", "slug": "apex-medical-group", "email": "contact@apex.com", "licence_number": "APX-003", "status": TenantStatus.approved},
    {"name": "Northgate Wellness", "slug": "northgate-wellness", "email": "contact@northgate.com", "licence_number": "NGT-004", "status": TenantStatus.approved},
    {"name": "Sunrise Family Practice", "slug": "sunrise-family-practice", "email": "contact@sunrisefp.com", "licence_number": "SRF-005", "status": TenantStatus.approved},
    {"name": "MetroCare Associates", "slug": "metrocare-associates", "email": "contact@metrocare.com", "licence_number": "MCA-006", "status": TenantStatus.approved},
    # Pending
    {"name": "Valley View Medical", "slug": "valley-view-medical", "email": "contact@valleyview.com", "licence_number": "VVM-007", "status": TenantStatus.pending},
    {"name": "Greenfield Clinic", "slug": "greenfield-clinic", "email": "contact@greenfield.com", "licence_number": "GFC-008", "status": TenantStatus.pending},
    {"name": "Coastal Health Group", "slug": "coastal-health-group", "email": "contact@coastalhealth.com", "licence_number": "CHG-009", "status": TenantStatus.pending},
    # Rejected
    {"name": "Downtown Wellness Hub", "slug": "downtown-wellness-hub", "email": "contact@downtownwellness.com", "licence_number": "DWH-010", "status": TenantStatus.rejected},
    {"name": "Peak Performance Health", "slug": "peak-performance-health", "email": "contact@peakperformance.com", "licence_number": "PPH-011", "status": TenantStatus.rejected},
    {"name": "Urban Care Clinic", "slug": "urban-care-clinic", "email": "contact@urbancare.com", "licence_number": "UCC-012", "status": TenantStatus.rejected},
    # Suspended
    {"name": "Harbor Medical Center", "slug": "harbor-medical-center", "email": "contact@harbormed.com", "licence_number": "HMC-013", "status": TenantStatus.suspended},
    {"name": "Summit Health Partners", "slug": "summit-health-partners", "email": "contact@summithealth.com", "licence_number": "SHP-014", "status": TenantStatus.suspended},
    # Archived
    {"name": "Legacy Care Network", "slug": "legacy-care-network", "email": "contact@legacycare.com", "licence_number": "LCN-015", "status": TenantStatus.archived},
    {"name": "Pioneer Medical Group", "slug": "pioneer-medical-group", "email": "contact@pioneermed.com", "licence_number": "PMG-016", "status": TenantStatus.archived},
]

# id, name, primary, secondary, background, foreground, muted, sort_order
SEED_BRAND_PALETTES = [
    (1, "Ocean Blue", "#2563eb", "#0ea5e9", "#f0f9ff", "#1e293b", "#94a3b8", 0),
    (2, "Forest Green", "#059669", "#10b981", "#ecfdf5", "#134e4a", "#6b7280", 1),
    (3, "Royal Purple", "#7c3aed", "#a78bfa", "#f5f3ff", "#4c1d95", "#9ca3af", 2),
    (4, "Sunset Orange", "#ea580c", "#fb923c", "#fff7ed", "#9a3412", "#6b7280", 3),
    (5, "Teal Wave", "#0891b2", "#22d3ee", "#ecfeff", "#155e75", "#94a3b8", 4),
    (6, "Crimson Red", "#dc2626", "#f87171", "#fef2f2", "#991b1b", "#94a3b8", 5),
    (7, "Midnight Indigo", "#4f46e5", "#818cf8", "#eef2ff", "#312e81", "#9ca3af", 6),
    (8, "Mint Fresh", "#10b981", "#34d399", "#d1fae5", "#064e3b", "#6b7280", 7),
    (9, "Amber Gold", "#d97706", "#fbbf24", "#fffbeb", "#78350f", "#94a3b8", 8),
    (10, "Rose Pink", "#e11d48", "#fb7185", "#fff1f2", "#881337", "#94a3b8", 9),
]

# id, name, header_font_family, body_font_family, sort_order
SEED_FONTS = [
    (1, "Inter", "Inter", "Inter", 0),
    (2, "Poppins + Open Sans", "Poppins", "Open Sans", 1),
    (3, "Roboto Slab + Roboto", "Roboto Slab", "Roboto", 2),
    (4, "Montserrat + Lato", "Montserrat", "Lato", 3),
    (5, "Playfair + Source Sans", "Playfair Display", "Source Sans 3", 4),
]

# tenant_name -> tenant_id at seed time. brand_id -> brand_palettes. font_id -> fonts.
# SEED_BRAND_THEMES: 1 Ocean Blue, 2 Forest Green, 3 Royal Purple, 4 Sunset Orange, 5 Teal Wave, 6 Crimson Red, ...
SEED_TENANT_DETAILS = [
    {"tenant_name": "Bluestone Clinic", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Your health, our priority", "title": "Bluestone Clinic",
     "about_text": "Bluestone Clinic has served the community for over 20 years.",
     "brand_id": 1, "font_id": 1},
    {"tenant_name": "Riverside Health Partners", "logo": "https://media.istockphoto.com/id/1624291952/vector/medical-health-logo-design-illustration.jpg?s=612x612&w=0&k=20&c=RdOq1SRcWwS_12_c5Zg2_QOUz1GD-YwGvfRodtOPN5w=", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Care close to home", "title": "Riverside Health Partners",
     "about_text": "Riverside Health Partners offers comprehensive care.",
     "brand_id": 2, "font_id": 2},
    {"tenant_name": "Apex Medical Group",
     "logo": "https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg?semt=ais_hybrid&w=740&q=80",
     "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80",
     "moto": "Excellence in urban healthcare",
     "title": "Apex Medical Group",
     "about_text": "Apex Medical Group has been the premier healthcare provider in the downtown metro area for over 25 years. Our state-of-the-art facility combines cutting-edge medical technology with a compassionate, patient-centered approach. We offer a full spectrum of services across six specialized departments—General Practice, Cardiology, Dermatology, Neurology, Orthopedics, and Pediatrics—staffed by board-certified physicians and dedicated support teams. From routine check-ups to advanced diagnostics and specialized treatments, Apex is your trusted partner for lasting health.",
     "brand_id": 3, "font_id": 3},
    {"tenant_name": "Northgate Wellness", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Holistic care for better living", "title": "Northgate Wellness",
     "about_text": "Northgate Wellness focuses on holistic approaches.",
     "brand_id": 6, "font_id": 4},
    {"tenant_name": "Sunrise Family Practice", "logo": "https://media.istockphoto.com/id/1624291952/vector/medical-health-logo-design-illustration.jpg?s=612x612&w=0&k=20&c=RdOq1SRcWwS_12_c5Zg2_QOUz1GD-YwGvfRodtOPN5w=", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Family care you can trust", "title": "Sunrise Family Practice",
     "about_text": "Sunrise Family Practice provides family-focused care.",
     "brand_id": 4, "font_id": 5},
    {"tenant_name": "MetroCare Associates", "logo": "https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg?semt=ais_hybrid&w=740&q=80", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Urban healthcare excellence", "title": "MetroCare Associates",
     "about_text": "MetroCare Associates offers metro-area healthcare.",
     "brand_id": 5, "font_id": 1},
    {"tenant_name": "Valley View Medical", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Your valley healthcare partner", "title": "Valley View Medical", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Greenfield Clinic", "logo": "https://media.istockphoto.com/id/1624291952/vector/medical-health-logo-design-illustration.jpg?s=612x612&w=0&k=20&c=RdOq1SRcWwS_12_c5Zg2_QOUz1GD-YwGvfRodtOPN5w=", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Growing with your community", "title": "Greenfield Clinic", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Coastal Health Group", "logo": "https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg?semt=ais_hybrid&w=740&q=80", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Coastal care at its best", "title": "Coastal Health Group", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Downtown Wellness Hub", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Downtown wellness solutions", "title": "Downtown Wellness Hub", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Peak Performance Health", "logo": "https://media.istockphoto.com/id/1624291952/vector/medical-health-logo-design-illustration.jpg?s=612x612&w=0&k=20&c=RdOq1SRcWwS_12_c5Zg2_QOUz1GD-YwGvfRodtOPN5w=", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Reach your health peak", "title": "Peak Performance Health", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Urban Care Clinic", "logo": "https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg?semt=ais_hybrid&w=740&q=80", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Urban healthcare access", "title": "Urban Care Clinic", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Harbor Medical Center", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Your harbor for health", "title": "Harbor Medical Center", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Summit Health Partners", "logo": "https://media.istockphoto.com/id/1624291952/vector/medical-health-logo-design-illustration.jpg?s=612x612&w=0&k=20&c=RdOq1SRcWwS_12_c5Zg2_QOUz1GD-YwGvfRodtOPN5w=", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Partners in summit health", "title": "Summit Health Partners", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Legacy Care Network", "logo": "https://img.freepik.com/free-vector/hospital-logo-design-vector-medical-cross_53876-136743.jpg?semt=ais_hybrid&w=740&q=80", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Legacy of care", "title": "Legacy Care Network", "brand_id": 1, "font_id": 1},
    {"tenant_name": "Pioneer Medical Group", "logo": "https://marketplace.canva.com/EAGeAJxtMvc/1/0/1600w/canva-blue-and-white-simple-medical-health-logo-arM9aB02SLw.jpg", "image": "https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80", "moto": "Pioneering better health", "title": "Pioneer Medical Group", "brand_id": 1, "font_id": 1},
]

SEED_SUBSCRIPTION_PLANS = [
    {"name": "FREE", "price": Decimal("0.00"), "duration": 30, "max_doctors": 5, "max_patients": 100, "max_departments": 3},
    {"name": "Small Clinic", "price": Decimal("1499.00"), "duration": 30, "max_doctors": 15, "max_patients": 1000, "max_departments": 8},
    {"name": "Medium Clinic", "price": Decimal("3999.00"), "duration": 30, "max_doctors": 50, "max_patients": 5000, "max_departments": 20},
    {"name": "Hospital", "price": Decimal("9999.00"), "duration": 30, "max_doctors": 200, "max_patients": 20000, "max_departments": 50},
]

# tenant_name, name, price, description
SEED_PRODUCTS = [
    # Bluestone Clinic (tenant.manager@seed.com)
    {"tenant_name": "Bluestone Clinic", "name": "Consultation Package", "price": 150.00, "description": "3-session consultation bundle"},
    {"tenant_name": "Bluestone Clinic", "name": "Health Check-Up", "price": 99.00, "description": "Comprehensive annual health screening"},
    {"tenant_name": "Bluestone Clinic", "name": "Blood Pressure Monitor", "price": 45.00, "description": "Home blood pressure monitor"},
    {"tenant_name": "Bluestone Clinic", "name": "First Aid Kit", "price": 28.00, "description": "Basic first aid kit for home use"},
    {"tenant_name": "Bluestone Clinic", "name": "Thermometer", "price": 18.00, "description": "Digital thermometer"},
    {"tenant_name": "Apex Medical Group", "name": "Vitamin D Supplement", "price": 25.00, "description": "Daily vitamin D supplement"},
    {"tenant_name": "Apex Medical Group", "name": "Multivitamin Pack", "price": 35.00, "description": "30-day multivitamin pack"},
    {"tenant_name": "Apex Medical Group", "name": "Blood Pressure Monitor", "price": 45.00, "description": "Home blood pressure monitor"},
    {"tenant_name": "Apex Medical Group", "name": "Thermometer", "price": 15.00, "description": "Digital thermometer"},
    {"tenant_name": "Apex Medical Group", "name": "First Aid Kit", "price": 30.00, "description": "Basic first aid kit"},
    {"tenant_name": "Apex Medical Group", "name": "Face Masks (50-pack)", "price": 20.00, "description": "Disposable face masks"},
    {"tenant_name": "Apex Medical Group", "name": "Hand Sanitizer (500ml)", "price": 12.00, "description": "Alcohol-based hand sanitizer"},
    {"tenant_name": "Apex Medical Group", "name": "Blood Glucose Meter", "price": 55.00, "description": "Diabetes monitoring device"},
    {"tenant_name": "Apex Medical Group", "name": "Pulse Oximeter", "price": 40.00, "description": "Finger pulse oximeter"},
    {"tenant_name": "Apex Medical Group", "name": "Heating Pad", "price": 28.00, "description": "Electric heating pad"},
]

SEED_DEPARTMENTS = [
    "General Practice",
    "Cardiology",
    "Pediatrics",
    "Dermatology",
    "Orthopedics",
    "Neurology",
]

# tenant_name, department_name, contact info
SEED_TENANT_DEPARTMENTS = [
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "phone_number": "+1-555-1001", "email": "gp@bluestone.com", "location": "Building A, Floor 1"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "phone_number": "+1-555-1002", "email": "cardio@bluestone.com", "location": "Building A, Floor 2"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Pediatrics", "phone_number": "+1-555-1003", "email": "pediatrics@bluestone.com", "location": "Building B, Floor 1"},
    {"tenant_name": "Riverside Health Partners", "department_name": "General Practice", "phone_number": "+1-555-2001", "email": "info@riverside.com", "location": "Main Street 100"},
    {"tenant_name": "Riverside Health Partners", "department_name": "Pediatrics", "phone_number": "+1-555-2002", "email": "pediatrics@riverside.com", "location": "Main Street 100, Wing B"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "phone_number": "+1-555-3001", "email": "gp@apex.com", "location": "Downtown Plaza, Level 1"},
    {"tenant_name": "Apex Medical Group", "department_name": "Cardiology", "phone_number": "+1-555-3002", "email": "cardio@apex.com", "location": "Downtown Plaza, Level 2"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "phone_number": "+1-555-3003", "email": "derma@apex.com", "location": "Downtown Plaza, Suite 301"},
    {"tenant_name": "Apex Medical Group", "department_name": "Neurology", "phone_number": "+1-555-3004", "email": "neuro@apex.com", "location": "Downtown Plaza, Level 3"},
    {"tenant_name": "Apex Medical Group", "department_name": "Orthopedics", "phone_number": "+1-555-3005", "email": "ortho@apex.com", "location": "Downtown Plaza, Suite 401"},
    {"tenant_name": "Apex Medical Group", "department_name": "Pediatrics", "phone_number": "+1-555-3006", "email": "pediatrics@apex.com", "location": "Downtown Plaza, Level 1, Wing B"},
    {"tenant_name": "Northgate Wellness", "department_name": "General Practice", "phone_number": "+1-555-4001", "email": "wellness@northgate.com", "location": "Northgate Center"},
    {"tenant_name": "Sunrise Family Practice", "department_name": "General Practice", "phone_number": "+1-555-5001", "email": "family@sunrisefp.com", "location": "Sunrise Mall"},
    {"tenant_name": "MetroCare Associates", "department_name": "General Practice", "phone_number": "+1-555-6001", "email": "metro@metrocare.com", "location": "Metro Tower"},
    {"tenant_name": "MetroCare Associates", "department_name": "Orthopedics", "phone_number": "+1-555-6002", "email": "ortho@metrocare.com", "location": "Metro Tower, Level 2"},
]

# user_email, tenant_name, specialization, licence_number, education, working_hours (optional)
SEED_DOCTORS = [
    {"user_email": "doctor.one@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "General Practice", "licence_number": "MD-BLU-001"},
    {"user_email": "doctor.two@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "Cardiology", "licence_number": "MD-BLU-002"},
    {"user_email": "doctor.seven@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "General Practice", "licence_number": "MD-BLU-003"},
    {"user_email": "doctor.eight@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "Cardiology", "licence_number": "MD-BLU-004"},
    {"user_email": "doctor.nine@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "Pediatrics", "licence_number": "MD-BLU-005"},
    {"user_email": "doctor.ten@seed.com", "tenant_name": "Bluestone Clinic", "specialization": "Dermatology", "licence_number": "MD-BLU-006"},
    {"user_email": "doctor.three@seed.com", "tenant_name": "Riverside Health Partners", "specialization": "General Practice", "licence_number": "MD-RIV-001"},
    {"user_email": "doctor.four@seed.com", "tenant_name": "Riverside Health Partners", "specialization": "Pediatrics", "licence_number": "MD-RIV-002"},
    # Apex Medical Group - full example
    {"user_email": "doctor.five@seed.com", "tenant_name": "Apex Medical Group", "specialization": "General Practice", "licence_number": "MD-APX-001",
     "education": "MD, Harvard Medical School; Residency at Johns Hopkins", "working_hours": {"mon": {"start": "08:00", "end": "17:00"}, "tue": {"start": "08:00", "end": "17:00"}, "wed": {"start": "08:00", "end": "17:00"}, "thu": {"start": "08:00", "end": "17:00"}, "fri": {"start": "08:00", "end": "15:00"}}},
    {"user_email": "doctor.six@seed.com", "tenant_name": "Apex Medical Group", "specialization": "Dermatology", "licence_number": "MD-APX-002",
     "education": "MD, Stanford; Dermatology fellowship at Mayo Clinic", "working_hours": {"mon": {"start": "09:00", "end": "16:00"}, "wed": {"start": "09:00", "end": "16:00"}, "fri": {"start": "09:00", "end": "14:00"}}},
]

# tenant_name, department_name, name, price, description
SEED_SERVICES = [
    # Bluestone Clinic
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "name": "Initial Consultation", "price": 120.00, "description": "First visit assessment"},
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "name": "Follow-up Visit", "price": 80.00, "description": "Routine follow-up"},
    {"tenant_name": "Bluestone Clinic", "department_name": "General Practice", "name": "Blood Test", "price": 45.00, "description": "Basic blood panel"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "name": "ECG", "price": 150.00, "description": "Electrocardiogram"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "name": "Stress Test", "price": 250.00, "description": "Cardiac stress test"},
    {"tenant_name": "Bluestone Clinic", "department_name": "Cardiology", "name": "Echocardiogram", "price": 320.00, "description": "Heart ultrasound"},
    # Riverside Health Partners
    {"tenant_name": "Riverside Health Partners", "department_name": "General Practice", "name": "General Check-up", "price": 100.00, "description": "Annual health check"},
    {"tenant_name": "Riverside Health Partners", "department_name": "General Practice", "name": "Vaccination", "price": 65.00, "description": "Routine vaccination"},
    {"tenant_name": "Riverside Health Partners", "department_name": "Pediatrics", "name": "Child Wellness Visit", "price": 90.00, "description": "Pediatric wellness exam"},
    {"tenant_name": "Riverside Health Partners", "department_name": "Pediatrics", "name": "Newborn Check", "price": 85.00, "description": "Newborn examination"},
    # Apex Medical Group - fullest example
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "name": "Initial Consultation", "price": 125.00, "description": "Comprehensive first-visit assessment"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "name": "Follow-up Visit", "price": 85.00, "description": "Routine follow-up consultation"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "name": "Annual Physical", "price": 150.00, "description": "Complete annual health examination"},
    {"tenant_name": "Apex Medical Group", "department_name": "General Practice", "name": "Blood Panel", "price": 55.00, "description": "Comprehensive blood work"},
    {"tenant_name": "Apex Medical Group", "department_name": "Cardiology", "name": "ECG", "price": 160.00, "description": "Electrocardiogram"},
    {"tenant_name": "Apex Medical Group", "department_name": "Cardiology", "name": "Stress Test", "price": 275.00, "description": "Exercise stress test"},
    {"tenant_name": "Apex Medical Group", "department_name": "Cardiology", "name": "Echocardiogram", "price": 350.00, "description": "Heart ultrasound"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "name": "Skin Screening", "price": 135.00, "description": "Full body skin cancer screening"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "name": "Mole Removal", "price": 225.00, "description": "Minor surgical removal"},
    {"tenant_name": "Apex Medical Group", "department_name": "Dermatology", "name": "Acne Treatment", "price": 95.00, "description": "Acne consultation and treatment plan"},
    {"tenant_name": "Apex Medical Group", "department_name": "Neurology", "name": "Neurological Exam", "price": 185.00, "description": "Comprehensive neurological assessment"},
    {"tenant_name": "Apex Medical Group", "department_name": "Neurology", "name": "EEG", "price": 290.00, "description": "Electroencephalogram"},
    {"tenant_name": "Apex Medical Group", "department_name": "Neurology", "name": "Headache Consultation", "price": 120.00, "description": "Specialized headache evaluation"},
    {"tenant_name": "Apex Medical Group", "department_name": "Orthopedics", "name": "Joint Assessment", "price": 195.00, "description": "Orthopedic joint evaluation"},
    {"tenant_name": "Apex Medical Group", "department_name": "Orthopedics", "name": "X-Ray", "price": 95.00, "description": "Diagnostic imaging"},
    {"tenant_name": "Apex Medical Group", "department_name": "Orthopedics", "name": "Physical Therapy Referral", "price": 75.00, "description": "PT evaluation and referral"},
    {"tenant_name": "Apex Medical Group", "department_name": "Pediatrics", "name": "Well Child Visit", "price": 115.00, "description": "Pediatric wellness exam"},
    {"tenant_name": "Apex Medical Group", "department_name": "Pediatrics", "name": "Vaccination", "price": 70.00, "description": "Immunization administration"},
    # Northgate Wellness
    {"tenant_name": "Northgate Wellness", "department_name": "General Practice", "name": "Wellness Visit", "price": 95.00, "description": "Holistic wellness assessment"},
    {"tenant_name": "Northgate Wellness", "department_name": "General Practice", "name": "Nutrition Consultation", "price": 75.00, "description": "Diet and nutrition advice"},
    # Sunrise Family Practice
    {"tenant_name": "Sunrise Family Practice", "department_name": "General Practice", "name": "Family Consultation", "price": 105.00, "description": "Family medicine consult"},
    {"tenant_name": "Sunrise Family Practice", "department_name": "General Practice", "name": "School Physical", "price": 55.00, "description": "School sports physical"},
    # MetroCare Associates
    {"tenant_name": "MetroCare Associates", "department_name": "General Practice", "name": "Office Visit", "price": 115.00, "description": "Standard office visit"},
    {"tenant_name": "MetroCare Associates", "department_name": "Orthopedics", "name": "Joint Assessment", "price": 180.00, "description": "Orthopedic joint evaluation"},
    {"tenant_name": "MetroCare Associates", "department_name": "Orthopedics", "name": "X-Ray", "price": 95.00, "description": "Diagnostic imaging"},
]

def seed_brand_palettes(session):
    existing = {b.id: b for b in session.query(BrandPalette).all()}
    for row in SEED_BRAND_PALETTES:
        bid, name, p, s, bg, fg, m, sort_order = row
        if bid not in existing:
            session.add(
                BrandPalette(
                    id=bid,
                    name=name,
                    brand_color_primary=p,
                    brand_color_secondary=s,
                    brand_color_background=bg,
                    brand_color_foreground=fg,
                    brand_color_muted=m,
                    sort_order=sort_order,
                )
            )
    session.flush()


def seed_fonts(session):
    existing = {f.id: f for f in session.query(Font).all()}
    for row in SEED_FONTS:
        fid, name, header, body, sort_order = row
        if fid not in existing:
            session.add(Font(id=fid, name=name, header_font_family=header, body_font_family=body, sort_order=sort_order))
    session.flush()
    return {f.id: f for f in session.query(Font).all()}


def seed_roles(session):
    roles_by_name = {role.name: role for role in session.query(Role).all()}

    for name in ROLE_NAMES:
        if name not in roles_by_name:
            role = Role(name=name)
            session.add(role)
            roles_by_name[name] = role

    session.flush()
    return roles_by_name


def seed_tenants(session):
    existing = {tenant.name: tenant for tenant in session.query(Tenant).all()}

    for payload in SEED_TENANTS:
        tenant = existing.get(payload["name"])
        if tenant is None:
            session.add(Tenant(**payload))
        elif not tenant.slug and payload.get("slug"):
            tenant.slug = payload["slug"]

def seed_tenant_details(session, tenants_by_name):
    from app.models import TenantDetails
    existing = {detail.tenant_id: detail for detail in session.query(TenantDetails).all()}

    for payload in SEED_TENANT_DETAILS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        if not tenant:
            continue
        detail = existing.get(tenant.id)
        if detail is None:
            p = {k: v for k, v in payload.items() if k != "tenant_name"}
            p["tenant_id"] = tenant.id
            session.add(TenantDetails(**p))
        else:
            for key in ("image", "brand_id", "font_id"):
                if key in payload and getattr(detail, key, None) is None:
                    setattr(detail, key, payload[key])

def seed_subscription_plans(session):
    existing = {subscription_plan.name: subscription_plan for subscription_plan in session.query(SubscriptionPlan).all()}

    for payload in SEED_SUBSCRIPTION_PLANS:
        plan = existing.get(payload["name"])
        if plan is None:
            session.add(SubscriptionPlan(**payload))


def seed_tenant_subscriptions(session, tenants_by_name):
    from app.models.tenant_subscription import SubscriptionStatus
    from datetime import timedelta
    
    # Get all subscription plans
    free_plan = session.query(SubscriptionPlan).filter(SubscriptionPlan.name == "FREE").first()
    small_clinic_plan = session.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Small Clinic").first()
    medium_clinic_plan = session.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Medium Clinic").first()
    hospital_plan = session.query(SubscriptionPlan).filter(SubscriptionPlan.name == "Hospital").first()
    
    if not free_plan:
        raise Exception("FREE subscription plan not found")
    
    existing_subscriptions = {
        (sub.tenant_id, sub.subscription_plan_id): sub 
        for sub in session.query(TenantSubscription).all()
    }
    
    # Map specific tenants to their subscription plans (non-FREE)
    specific_subscriptions = {
        "Bluestone Clinic": medium_clinic_plan,  # Tenant manager's clinic gets Medium plan
        "Riverside Health Partners": small_clinic_plan,  # Small Clinic plan
        "Apex Medical Group": hospital_plan,  # Hospital plan
    }
    
    # Create subscriptions for all approved tenants
    for tenant_name, tenant in tenants_by_name.items():
        if tenant.status == TenantStatus.approved:
            # Check if this tenant has a specific plan assigned
            specific_plan = specific_subscriptions.get(tenant_name)
            plan_to_use = specific_plan if specific_plan else free_plan
            
            key = (tenant.id, plan_to_use.id)
            
            # Skip if subscription already exists
            if key in existing_subscriptions:
                continue
            
            # Create subscription
            activated_at = datetime.now(timezone.utc)
            expires_at = activated_at + timedelta(days=plan_to_use.duration)
            
            subscription = TenantSubscription(
                tenant_id=tenant.id,
                subscription_plan_id=plan_to_use.id,
                activated_at=activated_at,
                expires_at=expires_at,
                status=SubscriptionStatus.ACTIVE
            )
            
            session.add(subscription)


def seed_users(session, roles_by_name):
    existing = {user.email: user for user in session.query(User).all()}

    for user in SEED_USERS:
        if user.email in existing:
            continue

        session.add(
            User(
                first_name=user.first_name,
                last_name=user.last_name,
                email=user.email,
                password=hash_password(user.password),
                role_id=roles_by_name[user.role_name].id,
            )
        )
    session.flush()
    return {u.email: u for u in session.query(User).all()}


def seed_departments(session):
    existing = {d.name: d for d in session.query(Department).all()}
    for name in SEED_DEPARTMENTS:
        if name not in existing:
            session.add(Department(name=name))
            existing[name] = None
    session.flush()
    return {d.name: d for d in session.query(Department).all()}


def seed_tenant_departments(session, tenants_by_name, departments_by_name):
    existing_keys = set()
    for td in session.query(TenantDepartment).join(Tenant).join(Department).all():
        # build key from the objects we'd get - we need tenant and dept from the query
        pass
    # Simpler: check existing by querying
    for payload in SEED_TENANT_DEPARTMENTS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        dept = departments_by_name.get(payload["department_name"])
        if not tenant or not dept:
            continue
        exists = session.query(TenantDepartment).filter(
            TenantDepartment.tenant_id == tenant.id,
            TenantDepartment.department_id == dept.id,
        ).first()
        if exists:
            continue
        session.add(
            TenantDepartment(
                tenant_id=tenant.id,
                department_id=dept.id,
                phone_number=payload.get("phone_number"),
                email=payload.get("email"),
                location=payload.get("location"),
            )
        )
    session.flush()


def _get_tenant_department(session, tenant_name, department_name, tenants_by_name, departments_by_name):
    tenant = tenants_by_name.get(tenant_name)
    dept = departments_by_name.get(department_name)
    if not tenant or not dept:
        return None
    return session.query(TenantDepartment).filter(
        TenantDepartment.tenant_id == tenant.id,
        TenantDepartment.department_id == dept.id,
    ).first()


def seed_doctors(session, users_by_email, tenants_by_name):
    existing_doctor_user_ids = {d.user_id for d in session.query(Doctor).all()}
    for payload in SEED_DOCTORS:
        user = users_by_email.get(payload["user_email"])
        tenant = tenants_by_name.get(payload["tenant_name"])
        if not user or not tenant:
            continue
        if user.id in existing_doctor_user_ids:
            continue
        session.add(
            Doctor(
                user_id=user.id,
                tenant_id=tenant.id,
                specialization=payload.get("specialization"),
                licence_number=payload.get("licence_number"),
                education=payload.get("education"),
                working_hours=payload.get("working_hours"),
                is_active=True,
            )
        )
        existing_doctor_user_ids.add(user.id)
    session.flush()


def seed_services(session, tenants_by_name, departments_by_name):
    existing = set()
    for s in session.query(Service).all():
        existing.add((s.tenant_departments_id, s.name))
    for payload in SEED_SERVICES:
        td = _get_tenant_department(
            session, payload["tenant_name"], payload["department_name"],
            tenants_by_name, departments_by_name
        )
        if not td or (td.id, payload["name"]) in existing:
            continue
        tenant = tenants_by_name.get(payload["tenant_name"])
        session.add(
            Service(
                name=payload["name"],
                price=Decimal(str(payload["price"])),
                description=payload.get("description"),
                tenant_departments_id=td.id,
                tenant_id=tenant.id,
                is_active=True,
            )
        )
        existing.add((td.id, payload["name"]))


def seed_tenant_managers(session, users_by_email, tenants_by_name):
    """Link tenant.manager@seed.com to Bluestone Clinic."""
    tm_user = users_by_email.get("tenant.manager@seed.com")
    bluestone = tenants_by_name.get("Bluestone Clinic")
    if not tm_user or not bluestone:
        return
    existing = session.query(TenantManager).filter(
        TenantManager.user_id == tm_user.id,
        TenantManager.tenant_id == bluestone.id,
    ).first()
    if not existing:
        session.add(TenantManager(user_id=tm_user.id, tenant_id=bluestone.id))


def seed_products(session, tenants_by_name):
    existing = set()
    for payload in SEED_PRODUCTS:
        tenant = tenants_by_name.get(payload["tenant_name"])
        if not tenant:
            continue
        key = (tenant.id, payload["name"])
        if key in existing:
            continue
        existing.add(key)
        session.add(
            Product(
                tenant_id=tenant.id,
                name=payload["name"],
                description=payload.get("description"),
                price=Decimal(str(payload["price"])),
                stock_quantity=0,
                is_available=True,
            )
        )
    session.flush()


def run_seed() -> None:
    session = SessionLocal()
    try:
        seed_brand_palettes(session)
        seed_fonts(session)
        roles_by_name = seed_roles(session)
        seed_tenants(session)
        session.commit()  # Ensure tenants are saved and IDs exist
        tenants_by_name = {t.name: t for t in session.query(Tenant).all()}
        seed_tenant_details(session, tenants_by_name)
        seed_subscription_plans(session)
        session.flush()  # Flush to make SubscriptionPlan records available for query
        seed_tenant_subscriptions(session, tenants_by_name)
        users_by_email = seed_users(session, roles_by_name)
        seed_tenant_managers(session, users_by_email, tenants_by_name)
        session.commit()
        departments_by_name = seed_departments(session)
        seed_tenant_departments(session, tenants_by_name, departments_by_name)
        seed_doctors(session, users_by_email, tenants_by_name)
        seed_services(session, tenants_by_name, departments_by_name)
        seed_products(session, tenants_by_name)
        session.commit()
        print("Seed completed.")
    except Exception:
        session.rollback()
        raise
    finally:
        session.close()


if __name__ == "__main__":
    run_seed()
