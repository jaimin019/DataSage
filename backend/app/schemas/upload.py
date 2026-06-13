from pydantic import BaseModel, ConfigDict
from typing import List, Any, Optional
from datetime import datetime
import uuid

class ColumnInfo(BaseModel):
    name: str
    dtype: str
    null_count: int
    null_pct: float
    sample_values: List[Any]
    
    model_config = ConfigDict(from_attributes=True)

class DatasetMetadata(BaseModel):
    filename: str
    row_count: int
    col_count: int
    file_size_bytes: int
    columns: List[ColumnInfo]
    cleaned_filename: str
    
    model_config = ConfigDict(from_attributes=True)

class UploadResponse(BaseModel):
    session_id: uuid.UUID
    status: str
    message: str
    dataset_info: DatasetMetadata
    
    model_config = ConfigDict(from_attributes=True)

class SessionStatusResponse(BaseModel):
    session_id: uuid.UUID
    status: str
    error_msg: Optional[str] = None
    status_detail: Optional[str] = None
    preferences_summary: Optional[str] = None
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)
