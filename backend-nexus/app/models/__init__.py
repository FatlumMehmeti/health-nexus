from .base import Base
from .role import Role
from .user import User
from .enrollment import Enrollment
from .enrollment import EnrollmentStatus
from .user_tenant_plan import UserTenantPlan
from .tenant import Tenant, TenantStatus
from .tenant_audit_log import TenantAuditLog
from .font import Font
from .brand_palette import BrandPalette
from .tenant_details import TenantDetails
from .subscription_plan import SubscriptionPlan
from .tenant_subscription import TenantSubscription
from .session import Session
from .department import Department
from .tenant_department import TenantDepartment
from .service import Service
from .doctor import Doctor
from .patient import Patient
from .tenant_manager import TenantManager
from .lead import Lead
from .lead_status_history import LeadStatusHistory
from .consultation_booking import ConsultationBooking, ConsultationStatus
from .appointment import Appointment
from .appointment import AppointmentStatus
from .appointment_status_history import AppointmentStatusHistory
from .report import Report
from .recommendation import Recommendation
from .offer_acceptance import OfferAcceptance
from .product import Product
from .cart import Cart
from .cart_item import CartItem
from .order import Order
from .order_item import OrderItem
from .payment import Payment
from .enrollment_status_history import EnrollmentStatusHistory
from .audit_event import AuditEvent
from .offer_delivery import OfferDelivery
from .contract import Contract, ContractStatus
from .notification import Notification, NotificationType
from .feature_flag import FeatureFlag

# Backward compatibility alias for legacy imports.
UserTenantMembership = Enrollment

__all__ = [
    "Base",
    "Font",
    "BrandPalette",
    "Role",
    "User",
    "Tenant",
    "TenantStatus",
    "TenantDetails",
    "Department",
    "TenantDepartment",
    "Service",
    "Doctor",
    "Patient",
    "Product",
    "Cart",
    "CartItem",
    "Order",
    "OrderItem",
    "Payment",
    "TenantManager",
    "Lead",
    "LeadStatusHistory",
    "ConsultationBooking",
    "Appointment",
    "AppointmentStatus",
    "AppointmentStatusHistory",
    "Report",
    "Recommendation",
    "OfferAcceptance",
    "Enrollment",
    "UserTenantMembership",
    "EnrollmentStatus",
    "EnrollmentStatusHistory",
    "AuditEvent",
    "UserTenantPlan",
    "OfferDelivery",
    "Notification",
    "NotificationType",
    "SubscriptionPlan",
    "TenantSubscription",
    "ConsultationStatus",
    "Session",
    "TenantAuditLog",
    "Contract",
    "ContractStatus",
    "FeatureFlag",
]
