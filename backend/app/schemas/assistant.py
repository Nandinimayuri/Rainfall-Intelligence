from typing import List, Optional
from pydantic import BaseModel, Field


class ChatMessage(BaseModel):
    role: str = Field(..., description="'user' or 'assistant'")
    content: str = Field(..., description="Message text content")


class ChatRequest(BaseModel):
    message: str = Field(..., description="User's query")
    district: Optional[str] = Field(None, description="Currently selected district")
    state: Optional[str] = Field(None, description="Currently selected state")
    lat: Optional[float] = Field(None, description="Latitude of selected location")
    lon: Optional[float] = Field(None, description="Longitude of selected location")
    history: Optional[List[ChatMessage]] = Field(default=[], description="Recent conversation turns")


class ChatResponse(BaseModel):
    reply: str
    district: str
    state: str
    regime: str
    status: str
    timestamp: str


class AssistantStatusResponse(BaseModel):
    configured: bool
    provider: str
    model: str
    status: str
    message: str
