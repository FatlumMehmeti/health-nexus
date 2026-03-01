"""add-tenant-scoped-patient-identity

Revision ID: 6b503c0133b7
Revises: 64d659958a52
Create Date: 2026-02-26 09:33:25.981006

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '6b503c0133b7'
down_revision: Union[str, Sequence[str], None] = '64d659958a52'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _drop_patient_fk_if_exists(table_name: str, constrained_columns: list[str]) -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    for fk in inspector.get_foreign_keys(table_name):
        if (
            fk.get("referred_table") == "patients"
            and fk.get("constrained_columns") == constrained_columns
            and fk.get("name")
        ):
            op.drop_constraint(fk["name"], table_name, type_="foreignkey")


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column("patients", sa.Column("tenant_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_patients_tenant_id",
        "patients",
        "tenants",
        ["tenant_id"],
        ["id"],
    )

    bind = op.get_bind()
    tenant_ids = [row[0] for row in bind.execute(sa.text("SELECT id FROM tenants ORDER BY id")).fetchall()]
    if tenant_ids:
        bind.execute(
            sa.text("UPDATE patients SET tenant_id = :tenant_id WHERE tenant_id IS NULL"),
            {"tenant_id": tenant_ids[0]},
        )

    remaining_without_tenant = bind.execute(
        sa.text("SELECT COUNT(*) FROM patients WHERE tenant_id IS NULL")
    ).scalar_one()
    if remaining_without_tenant:
        raise RuntimeError(
            "Cannot infer tenant_id for existing patients. Backfill patients.tenant_id and rerun migration."
        )

    _drop_patient_fk_if_exists("appointments", ["patient_user_id"])
    _drop_patient_fk_if_exists("carts", ["patient_user_id"])
    _drop_patient_fk_if_exists("orders", ["patient_user_id"])
    _drop_patient_fk_if_exists("reports", ["patient_user_id"])
    _drop_patient_fk_if_exists("offer_deliveries", ["patient_user_id"])
    _drop_patient_fk_if_exists("enrollments", ["patient_user_id"])

    op.alter_column("patients", "tenant_id", nullable=False)
    op.drop_constraint("patients_pkey", "patients", type_="primary")
    op.create_primary_key("patients_pkey", "patients", ["tenant_id", "user_id"])
    op.create_unique_constraint("uq_patients_tenant_user", "patients", ["tenant_id", "user_id"])

    op.create_foreign_key(
        "fk_appointments_patient_tenant_user",
        "appointments",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )
    op.create_foreign_key(
        "fk_carts_patient_tenant_user",
        "carts",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )
    op.create_foreign_key(
        "fk_orders_patient_tenant_user",
        "orders",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )
    op.create_foreign_key(
        "fk_reports_patient_tenant_user",
        "reports",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )
    op.create_foreign_key(
        "fk_offer_deliveries_patient_tenant_user",
        "offer_deliveries",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )
    op.create_foreign_key(
        "fk_enrollments_patient_tenant_user",
        "enrollments",
        "patients",
        ["tenant_id", "patient_user_id"],
        ["tenant_id", "user_id"],
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_constraint("fk_enrollments_patient_tenant_user", "enrollments", type_="foreignkey")
    op.drop_constraint("fk_offer_deliveries_patient_tenant_user", "offer_deliveries", type_="foreignkey")
    op.drop_constraint("fk_reports_patient_tenant_user", "reports", type_="foreignkey")
    op.drop_constraint("fk_orders_patient_tenant_user", "orders", type_="foreignkey")
    op.drop_constraint("fk_carts_patient_tenant_user", "carts", type_="foreignkey")
    op.drop_constraint("fk_appointments_patient_tenant_user", "appointments", type_="foreignkey")

    op.drop_constraint("uq_patients_tenant_user", "patients", type_="unique")
    op.drop_constraint("patients_pkey", "patients", type_="primary")
    op.create_primary_key("patients_pkey", "patients", ["user_id"])

    op.create_foreign_key(
        "fk_appointments_patient_user_id",
        "appointments",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )
    op.create_foreign_key(
        "fk_carts_patient_user_id",
        "carts",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )
    op.create_foreign_key(
        "fk_orders_patient_user_id",
        "orders",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )
    op.create_foreign_key(
        "fk_reports_patient_user_id",
        "reports",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )
    op.create_foreign_key(
        "fk_offer_deliveries_patient_user_id",
        "offer_deliveries",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )
    op.create_foreign_key(
        "fk_enrollments_patient_user_id",
        "enrollments",
        "patients",
        ["patient_user_id"],
        ["user_id"],
    )

    op.drop_constraint("fk_patients_tenant_id", "patients", type_="foreignkey")
    op.drop_column("patients", "tenant_id")