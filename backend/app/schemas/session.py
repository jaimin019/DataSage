from pydantic import BaseModel, ConfigDict
from datetime import datetime
from typing import Optional
import uuid

class SessionCreate(BaseModel):
    pass

class SessionRead(BaseModel):
    id: uuid.UUID
    status: str
    created_at: datetime
    updated_at: datetime
    error_msg: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)
