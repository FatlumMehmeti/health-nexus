from pydantic import BaseModel, ConfigDict
from typing import Optional


class RecommendationBase(BaseModel):
    service_id: int
    report_id: int


class RecommendationCreate(RecommendationBase):
    pass


class RecommendationRead(RecommendationBase):
    id: int

    model_config = ConfigDict(from_attributes=True)
