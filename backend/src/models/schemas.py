"""
Pydantic models for the Drift LangGraph service.

These models define the data structures for requests and responses
between Xano and the LangGraph workflow service.
"""

from typing import Optional, Dict, Any, List, Literal
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
    session_id: Optional[int] = Field(None, description="Xano session ID", alias="chat_user_session_id")
    visitor_ip_address: Optional[str] = Field(None, description="User's IP address")
    
    # Fields that Xano actually sends (based on n8n workflow)
    workflow_id: Optional[int] = Field(None, description="Current workflow ID (1, 2, or 3)")
    collected_fields: Optional[List[str]] = Field(
        None,
        description="List of field names that have been collected so far"
    )
    next_field: Optional[str] = Field(None, description="Next field to collect")
    workflow_status: Optional[str] = Field(
        default="active",
        description="Current workflow status"
    )
    
    # Legacy fields for compatibility
    collected_data: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Previously collected data from conversation"
    )
    workflow_state: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Workflow state including workflow_id, collected_fields, next_field"
    )
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
    specializations: List[str] = Field(default_factory=list)
    target_market: Optional[str] = None
    services_offered: List[str] = Field(default_factory=list)


# n8n Webhook Response Models (for Xano compatibility)

class N8nWebhookResponse(BaseModel):
    """
    Response model that exactly matches what n8n was sending to Xano.
    This ensures drop-in compatibility with existing Xano webhook logic.
    """
    role: Literal["assistant"] = Field(
        default="assistant",
        description="Always 'assistant' for compatibility"
    )
    content: str = Field(
        ...,
        description="The conversational response to the user"
    )
    workflow_id: int = Field(
        ...,
        description="Current workflow (1=general, 2=shopper, 3=personal)"
    )
    workflow_status: str = Field(
        ...,
        description="Status: 'active', 'optional_collection', 'showroom_in_progress'"
    )
    collected_data: Dict[str, Any] = Field(
        default_factory=dict,
        description="All collected data so far"
    )
    newly_collected_data: List[str] = Field(
        default_factory=list,
        description="Fields collected in this message (field names)"
    )
    next_field: Optional[str] = Field(
        None,
        description="Next field to collect"
    )


class XanoWebhookResponse(BaseModel):
    """
    Wrapper response that Xano expects from webhook endpoints.
    The n8n webhook returned this structure with response.body containing the data.
    """
    response: Dict[str, Any] = Field(
        ...,
        description="Response wrapper containing body and statusCode"
    )


# Intent Detection Models

class IntentRoute(BaseModel):
    """
    Structured output for intent detection routing.
    
    Maps user queries to specific workflow IDs based on the Drift PRD:
    - Workflow 1: General conversation/support
    - Workflow 2: Vehicle shopper data collection  
    - Workflow 3: Dealership data collection
    """
    workflow_id: Literal[1, 2, 3] = Field(
        ...,
        description="Workflow ID to route to: 1=general, 2=shopper, 3=personal_showroom"
    )
    confidence: float = Field(
        ...,
        description="Confidence score for the routing decision (0.0 to 1.0)",
        ge=0.0,
        le=1.0
    )
    reasoning: str = Field(
        ...,
        description="Brief explanation of why this workflow was chosen"
    )
    extracted_entities: Dict[str, Any] = Field(
        default_factory=dict,
        description="Key entities extracted from the user query"
    )


class ConversationState(BaseModel):
    """
    LangGraph conversation state that flows between nodes.
    
    This extends WorkflowState with LangGraph-specific routing information.
    """
    # Core message data
    user_query: str
    conversation_id: Optional[int] = None
    user_id: Optional[int] = None
    session_id: Optional[int] = None
    visitor_ip: Optional[str] = None
    
    # Intent detection results
    workflow_id: Optional[int] = None
    intent_confidence: Optional[float] = None
    intent_reasoning: Optional[str] = None
    
    # Data collection state
    collected_data: Dict[str, Any] = Field(default_factory=dict)
    required_fields: List[str] = Field(default_factory=list)
    completed_fields: List[str] = Field(default_factory=list)
    newly_collected_fields: List[str] = Field(default_factory=list)
    current_field: Optional[str] = None
    workflow_status: str = Field(default="active", description="Workflow status for Xano")
    
    # Response state
    assistant_message: str = ""
    next_question: Optional[str] = None
    conversation_complete: bool = False
    
    # Validation state
    validation_status: Optional[str] = None  # "pending", "success", "failed"
    validation_error: Optional[str] = None
    
    # Processing metadata
    processing_steps: List[str] = Field(default_factory=list)
    llm_model_used: Optional[str] = None
    error: Optional[str] = None
    
    model_config = {"protected_namespaces": ()}