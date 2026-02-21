"""
Simple CRUD test to verify database connection and basic operations
"""
from app.db import SessionLocal
from app.models import Role, User, Tenant, Membership, TenantSubscription
from datetime import datetime, timedelta


def test_crud_operations():
    session = SessionLocal()
    
    try:
        print("\n========== CRUD TESTING ==========\n")
        
        # TEST CREATE
        print("1. Testing CREATE...")
        role = Role(name="Admin")
        session.add(role)
        session.commit()
        print(f"✓ Created role: {role.name} (ID: {role.id})")
        
        # TEST READ
        print("\n2. Testing READ...")
        fetched_role = session.query(Role).filter(Role.name == "Admin").first()
        print(f"✓ Read role: {fetched_role.name} (ID: {fetched_role.id})")
        print(f"  Created at: {fetched_role.created_at}")
        
        # TEST UPDATE
        print("\n3. Testing UPDATE...")
        fetched_role.name = "SuperAdmin"
        session.commit()
        updated_role = session.query(Role).filter(Role.id == role.id).first()
        print(f"✓ Updated role name to: {updated_role.name}")
        print(f"  Updated at: {updated_role.updated_at}")
        
        # TEST CREATE with relationships
        print("\n4. Testing CREATE with relationships...")
        tenant = Tenant(logo="logo.png", moto="Health Nexus")
        session.add(tenant)
        session.flush()
        
        membership = Membership(name="Pro Plan", price=99.99, duration=30)
        session.add(membership)
        session.flush()
        
        subscription = TenantSubscription(
            tenant_id=tenant.id,
            membership_plan_id=membership.id,
            activated_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(days=30),
            is_active=True
        )
        session.add(subscription)
        session.commit()
        print(f"✓ Created tenant: {tenant.moto}")
        print(f"✓ Created membership: {membership.name}")
        print(f"✓ Created subscription for tenant {tenant.id}")
        
        # TEST COMPLEX READ
        print("\n5. Testing COMPLEX READ (relationships)...")
        fetched_subscription = session.query(TenantSubscription).filter(
            TenantSubscription.id == subscription.id
        ).first()
        print(f"✓ Subscription ID: {fetched_subscription.id}")
        print(f"  Tenant: {fetched_subscription.tenant.moto}")
        print(f"  Plan: {fetched_subscription.membership.name}")
        print(f"  Active: {fetched_subscription.is_active}")
        
        # TEST DELETE
        print("\n6. Testing DELETE...")
        session.delete(fetched_role)
        session.commit()
        deleted_check = session.query(Role).filter(Role.id == role.id).first()
        print(f"✓ Deleted role (ID: {role.id})")
        print(f"  Verification: {deleted_check is None}")
        
        print("\n========== ALL TESTS PASSED ✓ ==========\n")
        
    except Exception as e:
        session.rollback()
        print(f"\n✗ Error: {e}\n")
        raise
    finally:
        session.close()


if __name__ == "__main__":
    test_crud_operations()
