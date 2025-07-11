# drift-langgraph/src/workflows/main_workflow.py

from typing import Dict, Any, List, Optional, Literal
from langchain_core.messages import HumanMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from pydantic import BaseModel, Field
from datetime import datetime
import json

from ..models.schemas import (
    ConversationState, 
    WorkflowRoute,
    CollectedData,
    WebhookRequest,
    WebhookResponse
)
from ..utils.llm_clients import get_openai_client, get_gemini_client


class DriftWorkflowState(BaseModel):
    """Main state for the Drift workflow"""
    conversation_id: int
    workflow_id: int
    workflow_status: str = "active"
    messages: List[Dict[str, str]] = Field(default_factory=list)
    collected_data: Dict[str, Any] = Field(default_factory=dict)
    collected_fields: List[str] = Field(default_factory=list)
    next_field: Optional[str] = None
    current_message: str = ""
    response: Optional[str] = None
    newly_collected_fields: List[str] = Field(default_factory=list)
    
    class Config:
        arbitrary_types_allowed = True


class IntentDetectionNode:
    """Handles workflow routing based on user intent"""
    
    def __init__(self):
        self.llm = get_openai_client(model="gpt-3.5-turbo")
        
    async def detect_intent(self, state: DriftWorkflowState) -> DriftWorkflowState:
        """Determine which workflow to route to"""
        
        system_prompt = """You are driftBot's intent detection system. Analyze the user's message and current workflow state to determine the correct workflow routing.

Current Context:
- Current workflow_id: {workflow_id}
- User message: {message}

Available Workflows:
1. General chat (workflow_id = 1): General questions, greetings, or unclear intent
2. Shopper showroom (workflow_id = 2): Creating a showroom for a customer
3. Personal showroom (workflow_id = 3): Creating a personal showroom for the user

Decision Logic:
- If currently in workflow 2 or 3 and user is providing data, STAY in current workflow
- Only SWITCH for explicit requests like "personal showroom" or "shopper showroom"
- Default to workflow 1 for unclear messages

Return a JSON object with:
- selected_workflow_id: The workflow to route to (1, 2, or 3)
- switch: Boolean indicating if workflow is changing
- reasoning: Brief explanation
"""
        
        user_message = state.current_message
        response = await self.llm.ainvoke([
            {"role": "system", "content": system_prompt.format(
                workflow_id=state.workflow_id,
                message=user_message
            )},
            {"role": "user", "content": user_message}
        ])
        
        # Parse response
        intent_data = json.loads(response.content)
        
        # Update state with new workflow if switching
        if intent_data["switch"]:
            state.workflow_id = intent_data["selected_workflow_id"]
            
        return state


class GeneralChatNode:
    """Handles general conversation (workflow_id = 1)"""
    
    def __init__(self):
        self.llm = get_openai_client(model="gpt-3.5-turbo")
        
    async def chat(self, state: DriftWorkflowState) -> DriftWorkflowState:
        """Generate response for general chat"""
        
        system_prompt = """You are driftBot, an assistant for car sales experts. 
Help the user with anything they need. You are capable of searching the web, 
writing copy, vehicle research, etc.

Always be helpful and friendly. If the user wants to create a showroom, 
guide them to use the appropriate commands."""
        
        # Build conversation history
        messages = [{"role": "system", "content": system_prompt}]
        for msg in state.messages[-10:]:  # Last 10 messages for context
            messages.append(msg)
        messages.append({"role": "user", "content": state.current_message})
        
        response = await self.llm.ainvoke(messages)
        state.response = response.content
        
        return state


class DataCollectionNode:
    """Handles progressive data collection for showrooms"""
    
    def __init__(self):
        self.llm = get_gemini_client()
        
    async def collect_data(self, state: DriftWorkflowState) -> DriftWorkflowState:
        """Extract and validate data from user message"""
        
        # Define required fields based on workflow
        if state.workflow_id == 2:  # Shopper showroom
            required_fields = [
                "dealershipwebsite_url", "vehiclesearchpreference", 
                "vehicledetailspage_urls", "shopper_name", 
                "user_name", "user_phone"
            ]
            optional_fields = [
                "gender_descriptor", "age_descriptor", 
                "shopper_notes", "user_email"
            ]
        else:  # Personal showroom (workflow_id = 3)
            required_fields = [
                "dealershipwebsite_url", "vehicledetailspage_urls",
                "user_name", "user_phone", "user_email"
            ]
            optional_fields = ["vehiclesearchpreference"]
            
        all_fields = required_fields + optional_fields
        
        # Create extraction prompt
        extraction_prompt = f"""Extract ALL data you can identify from the user's message.
Current workflow: {state.workflow_id}
Already collected: {state.collected_fields}
Next priority field: {state.next_field}

Required fields: {required_fields}
Optional fields: {optional_fields}

User message: {state.current_message}

Extract data and return JSON with:
- collected_data: All extracted field values
- newly_collected_fields: List of fields extracted from this message
- next_field: Next field to collect (first missing required, then optional)
- workflow_status: "active", "optional_collection", or "showroom_in_progress"
- content: Conversational response to user
"""
        
        response = await self.llm.ainvoke([
            {"role": "system", "content": extraction_prompt},
            {"role": "user", "content": state.current_message}
        ])
        
        # Parse extraction results
        extracted = json.loads(response.content)
        
        # Update state
        state.collected_data.update(extracted["collected_data"])
        state.newly_collected_fields = extracted["newly_collected_fields"]
        state.collected_fields.extend(extracted["newly_collected_fields"])
        state.next_field = extracted["next_field"]
        state.workflow_status = extracted["workflow_status"]
        state.response = extracted["content"]
        
        # Check if all required fields collected
        all_required_collected = all(
            field in state.collected_fields for field in required_fields
        )
        
        if all_required_collected and state.workflow_status == "active":
            state.workflow_status = "optional_collection"
            
        return state


def should_route_to_intent(state: DriftWorkflowState) -> bool:
    """Determine if we need intent detection"""
    # Route to intent detection if no workflow set or switching indicated
    return state.workflow_id is None or "switch" in state.current_message.lower()


def route_after_intent(state: DriftWorkflowState) -> str:
    """Route based on detected workflow"""
    if state.workflow_id == 1:
        return "general_chat"
    else:
        return "data_collection"


def is_showroom_ready(state: DriftWorkflowState) -> str:
    """Check if showroom creation should trigger"""
    if state.workflow_status == "showroom_in_progress":
        return "end"
    return "continue"


# Build the workflow graph
def create_drift_workflow():
    """Create the main LangGraph workflow"""
    
    # Initialize the graph
    workflow = StateGraph(DriftWorkflowState)
    
    # Add nodes
    intent_node = IntentDetectionNode()
    chat_node = GeneralChatNode()
    collection_node = DataCollectionNode()
    
    workflow.add_node("intent_detection", intent_node.detect_intent)
    workflow.add_node("general_chat", chat_node.chat)
    workflow.add_node("data_collection", collection_node.collect_data)
    
    # Add edges
    workflow.set_entry_point("intent_detection")
    
    # Conditional routing after intent detection
    workflow.add_conditional_edges(
        "intent_detection",
        route_after_intent,
        {
            "general_chat": "general_chat",
            "data_collection": "data_collection"
        }
    )
    
    # After chat or collection, check if done
    workflow.add_conditional_edges(
        "general_chat",
        lambda x: "end",
        {"end": END}
    )
    
    workflow.add_conditional_edges(
        "data_collection",
        is_showroom_ready,
        {
            "end": END,
            "continue": "data_collection"
        }
    )
    
    return workflow.compile()


# FastAPI endpoint handler
async def process_webhook_request(request: WebhookRequest) -> WebhookResponse:
    """Process incoming webhook request from Xano"""
    
    # Initialize state from request
    state = DriftWorkflowState(
        conversation_id=request.conversation_id,
        workflow_id=request.workflow_id,
        workflow_status=request.workflow_status,
        collected_data=request.collected_data,
        collected_fields=request.workflow_state.get("collected_fields", []),
        next_field=request.workflow_state.get("next_field"),
        current_message=request.message
    )
    
    # Run the workflow
    workflow = create_drift_workflow()
    result = await workflow.ainvoke(state)
    
    # Build response
    return WebhookResponse(
        role="assistant",
        content=result.response,
        workflow_id=result.workflow_id,
        workflow_status=result.workflow_status,
        collected_data=result.collected_data,
        newly_collected_data=result.newly_collected_fields,
        next_field=result.next_field
    )