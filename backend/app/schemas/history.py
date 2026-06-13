from pydantic import BaseModel, ConfigDict, computed_field
from datetime import datetime
from typing import Optional, List

class HistoryItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    session_id:      str
    status:          str
    created_at:      datetime
    original_name:   Optional[str]
    cleaned_filename: Optional[str]
    row_count:       Optional[int]
    col_count:       Optional[int]
    file_size_bytes: Optional[int]
    display_name:    Optional[str]       # user's custom label (null = use original_name)
    is_starred:      bool
    insight_count:   int
    has_forecast:    bool
    chart_count:     int
    preferences_summary: Optional[str]

    @computed_field
    @property
    def effective_name(self) -> str:
        """What to show in the UI: custom name if set, else original filename."""
        return self.display_name or self.original_name or "Untitled Analysis"

class HistoryResponse(BaseModel):
    items:       List[HistoryItem]
    total:       int
    page:        int
    limit:       int
    total_pages: int

class LabelUpdateRequest(BaseModel):
    display_name: Optional[str] = None      # null = clear custom name
    is_starred:   Optional[bool] = None     # null = no change
