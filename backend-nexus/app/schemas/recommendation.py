from pydantic import BaseModel
from typing import Optional


class RecommendationBase(BaseModel):
    service_id: int
    report_id: int


class RecommendationCreate(RecommendationBase):
    pass


class RecommendationRead(RecommendationBase):
    id: int

    class Config:
        from_attributes = True  # for SQLAlchemy 2.0