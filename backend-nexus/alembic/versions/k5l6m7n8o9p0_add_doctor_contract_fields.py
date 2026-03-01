"""Add doctor, salary, terms, signatures to contracts

Revision ID: k5l6m7n8o9p0
Revises: j4k5l6m7n8o9
Create Date: 2026-02-28

"""
from alembic import op
import sqlalchemy as sa

revision = "k5l6m7n8o9p0"
down_revision = "j4k5l6m7n8o9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("contracts", sa.Column("doctor_user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_contracts_doctor_user_id",
        "contracts",
        "doctors",
        ["doctor_user_id"],
        ["user_id"],
    )
    op.create_index("ix_contracts_doctor_user_id", "contracts", ["doctor_user_id"], unique=False)

    op.add_column("contracts", sa.Column("salary", sa.Numeric(12, 2), nullable=True))
    op.add_column("contracts", sa.Column("terms_content", sa.Text(), nullable=True))
    op.add_column("contracts", sa.Column("start_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contracts", sa.Column("end_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contracts", sa.Column("doctor_signed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contracts", sa.Column("doctor_signature", sa.Text(), nullable=True))
    op.add_column("contracts", sa.Column("hospital_signed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("contracts", sa.Column("hospital_signature", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_index("ix_contracts_doctor_user_id", table_name="contracts")
    op.drop_constraint("fk_contracts_doctor_user_id", "contracts", type_="foreignkey")
    op.drop_column("contracts", "doctor_user_id")
    op.drop_column("contracts", "salary")
    op.drop_column("contracts", "terms_content")
    op.drop_column("contracts", "start_date")
    op.drop_column("contracts", "end_date")
    op.drop_column("contracts", "doctor_signed_at")
    op.drop_column("contracts", "doctor_signature")
    op.drop_column("contracts", "hospital_signed_at")
    op.drop_column("contracts", "hospital_signature")
