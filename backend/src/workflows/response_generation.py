"""
Response generation and next step determination nodes.

These nodes handle final response processing and determine
whether the conversation should continue with additional questions.
"""
import os
import logging
from typing import Dict, Any

from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import SecretStr

from ..models.schemas import ConversationState
from .data_collection import FIELD_DESCRIPTIONS

logger = logging.getLogger(__name__)

# Model configuration
GPT_MODEL = "gpt-3.5-turbo"  # For routing and general chat


async def generate_response_node(state: ConversationState) -> ConversationState:
    """
    Final response processing and formatting.
    
    This node handles the final response generation if not already done by workflow nodes.
    It acts as a fallback to ensure every conversation gets a response.
    
    Args:
        state: Current conversation state
        
    Returns:
        Updated conversation state with final response
    """
    logger.info("Processing final response...")
    
    try:
        # If assistant_message is already set by workflow nodes, use it
        if getattr(state, "assistant_message", None):
            # Already set, just append step and return
            state.processing_steps.append("response_passed_through")
            logger.info("Response passed through from workflow node")
            return state
        
        # Fallback response generation if needed
        llm = ChatOpenAI(
            model=GPT_MODEL,
            temperature=0.7,
            api_key=get_secret("OPENAI_API_KEY")
        )
        
        # Build context from collected data
        data_context = getattr(state, "collected_data", {})
        data_summary = f"\nCollected data: {data_context}" if data_context else ""
        
        system_prompt = f"""You are a helpful assistant for Drift, a B2B SaaS platform for automotive dealership salespeople.

Context:
- Salesperson query: {state.user_query}
- Workflow ID: {getattr(state, 'workflow_id', 'unknown')}{data_summary}

Generate a helpful, conversational response that acknowledges the salesperson's input and guides them toward their showroom creation goals (either for customers or their personal showroom).

Always address them as a salesperson. Keep responses concise and natural."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.user_query)
        ]
        
        result = await llm.ainvoke(messages)
        content = getattr(result, "content", result)
        if isinstance(content, list):
            content = " ".join(str(x) for x in content)
        content_str = str(content)
        
        state.assistant_message = content_str.strip() if hasattr(content_str, "strip") else content_str
        state.processing_steps.append("fallback_response_generated")
        
        logger.info("Fallback response generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        state.assistant_message = "I'm here to help you as a salesperson create showrooms for your customers. Could you tell me more about what you're working on?"
        state.error = str(e)
    
    return state


async def determine_next_step_node(state: ConversationState) -> ConversationState:
    """
    Determine if conversation should continue and what to ask next.
    
    This node analyzes the collected data and determines if more information
    is needed based on workflow requirements from the PRD.
    
    Args:
        state: Current conversation state
        
    Returns:
        Updated conversation state with next question (if needed)
    """
    logger.info("Determining next steps...")
    
    try:
        workflow_id = getattr(state, "workflow_id", 1)
        collected_data = getattr(state, "collected_data", {})
        
        # Determine conversation completeness based on workflow
        if workflow_id == 1:  # General workflow
            state.conversation_complete = True
            state.next_question = None
            
        elif workflow_id == 2:  # Shopper workflow - salesperson creating for customer
            # Check for required fields from PRD
            missing_fields = []
            if not collected_data.get("dealershipwebsite_url"):
                missing_fields.append("your dealership website URL")
            if not collected_data.get("shopper_name"):
                missing_fields.append("your customer's name")
            if not collected_data.get("user_name"):
                missing_fields.append("your name")
            if not collected_data.get("user_phone"):
                missing_fields.append("your phone number")
            if not collected_data.get("vehiclesearchpreference") and not collected_data.get("vehicledetailspage_urls"):
                missing_fields.append("vehicle preferences or specific vehicle URLs")
            
            if missing_fields:
                state.next_question = f"Could you also provide {missing_fields[0]}?"
                state.conversation_complete = False
                state.workflow_status = "active"  # Still collecting required data
            else:
                # All required fields collected, move to optional collection
                state.conversation_complete = False  # Not complete until showroom created
                state.workflow_status = "optional_collection"
                state.next_question = "I have all the required information. Would you like to add any optional details like your customer's interests, age range, or location? Or shall I proceed with creating the showroom?"
                
        elif workflow_id == 3:  # Personal showroom workflow - salesperson's vehicle showcase
            # Check for required fields from PRD for personal showcase
            missing_fields = []
            if not collected_data.get("dealershipwebsite_url"):
                missing_fields.append("your dealership website URL")
            if not collected_data.get("user_name"):
                missing_fields.append("your name")
            if not collected_data.get("user_phone"):
                missing_fields.append("your phone number")
            if not collected_data.get("user_email"):
                missing_fields.append("your email")
            if not collected_data.get("vehicledetailspage_urls"):
                missing_fields.append("specific vehicle URLs you want to showcase")
            
            if missing_fields:
                state.next_question = f"Could you also share {missing_fields[0]}?"
                state.conversation_complete = False
                state.workflow_status = "active"  # Still collecting required data
            else:
                # All required fields collected, ready to create
                state.conversation_complete = True
                state.workflow_status = "showroom_in_progress"
                state.next_question = None
        
        state.processing_steps.append(f"conversation_complete: {state.conversation_complete}")
        logger.info(f"Next steps determined - Complete: {state.conversation_complete}")
        
    except Exception as e:
        logger.error(f"Error determining next steps: {str(e)}")
        state.conversation_complete = False
        state.next_question = "How else can I help you as a salesperson?"
        state.error = str(e)
    
    return state


def get_secret(key: str) -> SecretStr:
    """
    Get secret value from environment variable.
    
    Args:
        key: Environment variable name
        
    Returns:
        SecretStr containing the value or None
    """
    val = os.getenv(key)
    return SecretStr(val) if val else None


__all__ = ["generate_response_node", "determine_next_step_node"]