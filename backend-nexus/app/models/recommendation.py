from sqlalchemy import Column, Integer, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .base import Base


class Recommendation(Base):
    __tablename__ = "recommendations"

    __table_args__ = (UniqueConstraint("service_id", "report_id", name="unique_service_report"),)

    id = Column(Integer, primary_key=True, index=True)

    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    report_id = Column(Integer, ForeignKey("reports.id"), nullable=False)

    # Relationships
    service = relationship("Service", backref="recommendations")
    report = relationship("Report", backref="recommendations")
