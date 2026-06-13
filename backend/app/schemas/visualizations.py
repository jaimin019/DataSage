from pydantic import BaseModel, ConfigDict
from uuid import UUID

class ChartResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    chart_id:    str
    type:        str
    title:       str
    description: str
    image_url:   str
    sort_order:  int

class VisualizationsResponse(BaseModel):
    session_id: UUID
    charts:     list[ChartResponse]
