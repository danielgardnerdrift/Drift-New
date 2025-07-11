"""
Pydantic models for the Drift LangGraph service.

These models define the data structures for requests and responses
between Xano and the LangGraph workflow service.
"""

from typing import Optional, Dict, Any, List
from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    """
    Request model for chat processing from Xano.
    
    This matches the data structure sent from Xano's /chat/message_complete
    endpoint to the LangGraph service (replacing the n8n webhook).
    """
    user_query: str = Field(..., description="The user's chat message/query")
    conversation_id: Optional[int] = Field(None, description="Xano conversation ID")
    user_id: Optional[int] = Field(None, description="Xano user ID if authenticated")
    chat_user_session_id: Optional[int] = Field(None, description="Xano session ID")
    visitor_ip_address: Optional[str] = Field(None, description="User's IP address")
    additional_context: Optional[Dict[str, Any]] = Field(
        None, 
        description="Additional context from previous conversation"
    )


class ChatResponse(BaseModel):
    """
    Response model for chat processing back to Xano.
    
    This is the response sent back to Xano after LangGraph processing.
    """
    success: bool = Field(..., description="Whether processing was successful")
    message: str = Field(..., description="Response message for the user")
    collected_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="Data collected during conversation"
    )
    next_question: Optional[str] = Field(
        None,
        description="Next question to ask if conversation continues"
    )
    conversation_complete: bool = Field(
        False,
        description="Whether the data collection conversation is complete"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        None,
        description="Additional metadata about the processing"
    )


class HealthResponse(BaseModel):
    """Health check response model."""
    status: str = Field(..., description="Service health status")
    service: str = Field(..., description="Service name")
    version: str = Field(..., description="Service version")


class WorkflowState(BaseModel):
    """
    LangGraph workflow state model.
    
    Represents the state passed between nodes in the LangGraph workflow.
    """
    # Input data
    user_query: str
    conversation_id: Optional[int] = None
    user_id: Optional[int] = None
    session_id: Optional[int] = None
    visitor_ip: Optional[str] = None
    additional_context: Dict[str, Any] = Field(default_factory=dict)
    
    # Processing state
    intent: Optional[str] = None
    extracted_entities: Dict[str, Any] = Field(default_factory=dict)
    collected_data: Dict[str, Any] = Field(default_factory=dict)
    
    # Response generation
    response_message: str = ""
    next_question: Optional[str] = None
    conversation_complete: bool = False
    
    # Metadata
    processing_steps: List[str] = Field(default_factory=list)
    model_used: Optional[str] = None
    confidence_score: Optional[float] = None


class VehicleData(BaseModel):
    """Vehicle-specific data model for the Drift application."""
    make: Optional[str] = None
    model: Optional[str] = None
    year: Optional[int] = None
    trim: Optional[str] = None
    color: Optional[str] = None
    mileage: Optional[int] = None
    vin: Optional[str] = None
    price_range: Optional[str] = None
    financing_needed: Optional[bool] = None
    trade_in_vehicle: Optional[bool] = None


class CustomerData(BaseModel):
    """Customer-specific data model for the Drift application."""
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    preferred_contact_method: Optional[str] = None
    location: Optional[str] = None
    budget: Optional[str] = None
    timeframe: Optional[str] = None
    financing_preapproved: Optional[bool] = None


class DealershipData(BaseModel):
    """Dealership-specific data model for the Drift application."""
    showroom_type: Optional[str] = None  # virtual, physical, hybrid
    inventory_size: Optional[str] = None
    specializations: List[str] = Field(default_factory=list)
    target_market: Optional[str] = None
    business_hours: Optional[str] = None
    services_offered: List[str] = Field(default_factory=list)