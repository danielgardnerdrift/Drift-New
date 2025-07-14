"""
Shopper showroom workflow node for handling vehicle shopper data collection.

This workflow (workflow_id = 2) handles the case where a salesperson is
creating a showroom FOR a specific customer/shopper.
"""
import os
import json
import logging
from typing import Dict, Any, Optional
import asyncio

from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage
from pydantic import SecretStr
from openai import AsyncOpenAI

from ..models.schemas import ConversationState
from .data_collection import FIELD_DESCRIPTIONS
from ..utils.ui_tools import create_ui_tools, generate_jsx_for_tool, get_ui_generation_prompt

logger = logging.getLogger(__name__)

# Model configurations
GPT_MODEL = "gpt-3.5-turbo"  # For routing and general chat
GEMINI_MODEL = "gemini-1.5-flash"  # For data extraction


async def shopper_showroom_workflow_node(state: ConversationState) -> ConversationState:
    """
    Handle vehicle shopper data collection (Workflow 2).
    
    This node processes messages where a salesperson is creating a showroom
    for a specific customer, extracting relevant customer and vehicle data.
    
    Args:
        state: Current conversation state
        
    Returns:
        Updated conversation state with extracted data and response
    """
    logger.info("Processing shopper workflow...")
    
    try:
        # Use Gemini for data extraction as specified in PRD
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0,
            api_key=get_secret("GOOGLE_AI_API_KEY")
        )
        
        # Extract shopper showroom data from salesperson
        extraction_prompt = """Extract shopper showroom information from the salesperson's message.

CONTEXT: The salesperson is creating a showroom FOR a specific customer/shopper.

Extract and return JSON with these exact fields from PRD when mentioned:
{
  "dealershipwebsite_url": "salesperson's dealership website URL",
  "vehicledetailspage_urls": ["specific vehicle page URLs for the customer"],
  "shopper_name": "customer/shopper's name",
  "user_name": "salesperson's name",
  "user_phone": "salesperson's phone number",
  "user_email": "salesperson's email (optional)",
  "vehiclesearchpreference": [{
    "make": "vehicle make",
    "model": "vehicle model",
    "year_min": minimum_year,
    "year_max": maximum_year,
    "price_min": minimum_price,
    "price_max": maximum_price,
    "exterior_color": ["color preferences"],
    "interior_color": ["interior color preferences"],
    "miles_min": minimum_mileage,
    "miles_max": maximum_mileage,
    "condition": ["New", "Used", "Certified"],
    "body_style": "SUV/sedan/truck/etc"
  }],
  "gender_descriptor": "inferred from pronouns (he/she/they)",
  "age_descriptor": "inferred age range like '30s', '40s'",
  "shopper_notes": "free text about customer lifestyle, location, notes"
}

IMPORTANT: 
- gender_descriptor and age_descriptor are INFERRED from conversation, not asked directly
- shopper_notes captures free-form customer information
- Only include fields that are explicitly mentioned or can be inferred
Return {"extracted": false} if no relevant data found."""

        messages = [
            SystemMessage(content=extraction_prompt),
            HumanMessage(content=f"Extract from: {state.user_query}")
        ]
        
        result = await llm.ainvoke(messages)
        content = getattr(result, "content", result)
        if isinstance(content, list):
            content = " ".join(str(x) for x in content)
        
        try:
            extracted_data = json.loads(str(content).strip())
            
            if extracted_data.get("extracted") is not False:
                # Merge with existing collected data
                if not hasattr(state, "collected_data") or state.collected_data is None:
                    state.collected_data = {}
                
                # Directly merge fields (not nested in categories) to match PRD structure
                for field, value in extracted_data.items():
                    if field != "extracted":
                        state.collected_data[field] = value
                
                state.processing_steps.append(f"shopper_data_extracted: {list(extracted_data.keys())}")
        
        except json.JSONDecodeError:
            logger.error(f"Failed to parse shopper data JSON: {content}")
            state.processing_steps.append("shopper_data_extraction_failed")
        
        # Check if user wants to proceed with showroom creation
        proceed_keywords = ["proceed", "create", "let's do it", "go ahead", "yes", "ready", "start", "build"]
        user_query_lower = state.user_query.lower()
        wants_to_proceed = any(keyword in user_query_lower for keyword in proceed_keywords)
        
        # Update workflow status if in optional collection and user wants to proceed
        if state.workflow_status == "optional_collection" and wants_to_proceed:
            state.workflow_status = "showroom_in_progress"
            state.conversation_complete = True
            state.assistant_message = "Perfect! I have all the required information and I'm now processing your showroom creation. This should only take a few seconds!"
            state.processing_steps.append("showroom_creation_initiated")
            logger.info("User requested to proceed with showroom creation")
            return state
        
        # Generate contextual response using n8n-style active prompting
        data_context = json.dumps(getattr(state, "collected_data", {}), indent=2)
        newly_collected = getattr(state, "newly_collected_fields", [])
        current_field = getattr(state, "current_field", None)
        workflow_status = getattr(state, "workflow_status", "active")
        
        # Map backend field descriptors to actual field names for clearer prompting
        field_mapping = {
            "your dealership website URL": "dealershipwebsite_url",
            "your customer's name": "shopper_name", 
            "your name": "user_name",
            "your phone number": "user_phone",
            "vehicle preferences or specific vehicle page URLs": "vehiclesearchpreference/vehicledetailspage_urls"
        }
        
        response_prompt = f"""Generate a conversational response following this EXACT pattern:

Current Context:
- Workflow Status: {workflow_status}
- Newly Collected Fields: {newly_collected}
- Next Priority Field: {current_field}
- All Collected Data: {data_context}

CRITICAL INSTRUCTIONS - Follow this response pattern EXACTLY:

1. **Acknowledge what you collected** (if any new data was extracted):
   - Confirm the specific information just provided
   - Be specific about what you understood
   
2. **Ask for the next priority field** (if there is one):
   - Focus on ONLY the field specified in "Next Priority Field"
   - Be specific and direct about what you need
   - Provide helpful context or examples
   
3. **Be encouraging and specific**:
   - Keep the salesperson engaged
   - Use conversational, friendly tone
   - When asking for vehicle detail page URLs, explain: "Please provide the specific webpage URLs for each vehicle your customer wants to see in their showroom"

IMPORTANT RULES:
- If workflow_status is "optional_collection", remind them they can proceed with creation at any time
- If NO next priority field, ask if they want to add optional details or proceed with creation
- NEVER ask for multiple fields at once - focus ONLY on the next priority field
- NEVER provide a list of all required fields upfront
- Address them as a salesperson creating for their customer

Example Response Pattern:
"Great! I've got [specific data acknowledged]. Now, to continue creating the showroom for [customer name if known], I'll need [next priority field with helpful context]. [Encouraging statement or example]"

User's message: {state.user_query}"""

        response_llm = ChatOpenAI(
            model=GPT_MODEL,
            temperature=0.7,
            api_key=get_secret("OPENAI_API_KEY")
        )
        
        response_result = await response_llm.ainvoke([
            SystemMessage(content=response_prompt),
            HumanMessage(content=state.user_query)
        ])
        
        content = getattr(response_result, "content", response_result)
        if isinstance(content, list):
            content = " ".join(str(x) for x in content)
        content_str = str(content)
        
        # Check if we need to generate UI components
        needs_ui = (
            state.workflow_status in ["active", "optional_collection"] or
            state.current_field is not None or
            (state.collected_data and len(state.collected_data) > 0)
        )
        
        if needs_ui and state.current_field:
            # Generate UI using OpenAI with tools
            try:
                openai_client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                
                # Get UI generation prompt and tools
                ui_prompt = get_ui_generation_prompt(
                    state.current_field,
                    state.collected_data or {},
                    state.workflow_id
                )
                
                # Create the completion with tools
                completion = await openai_client.chat.completions.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": ui_prompt},
                        {"role": "user", "content": f"Generate UI for collecting: {state.current_field}"}
                    ],
                    tools=create_ui_tools(),
                    tool_choice="auto",
                    temperature=0.3
                )
                
                # Process tool calls and generate JSX
                ui_components = []
                if completion.choices[0].message.tool_calls:
                    for tool_call in completion.choices[0].message.tool_calls:
                        tool_name = tool_call.function.name
                        tool_args = json.loads(tool_call.function.arguments)
                        jsx = generate_jsx_for_tool(tool_name, tool_args)
                        ui_components.append(jsx)
                
                # If UI was generated, append it to the message
                if ui_components:
                    ui_jsx = "\n".join(ui_components)
                    # Wrap in a container div
                    ui_jsx = f"""<div className="ui-generated-form space-y-4">
{ui_jsx}
</div>"""
                    
                    # Add UI marker to the message for frontend parsing
                    state.assistant_message = f"{content_str.strip()}\n\n[UI_COMPONENT_START]\n{ui_jsx}\n[UI_COMPONENT_END]"
                    state.processing_steps.append("ui_generated")
                    logger.info(f"Generated UI for field: {state.current_field}")
                else:
                    state.assistant_message = content_str.strip() if hasattr(content_str, "strip") else content_str
                    
            except Exception as ui_error:
                logger.error(f"Error generating UI: {str(ui_error)}")
                # Fallback to text-only response
                state.assistant_message = content_str.strip() if hasattr(content_str, "strip") else content_str
        else:
            state.assistant_message = content_str.strip() if hasattr(content_str, "strip") else content_str
        
        state.processing_steps.append("shopper_showroom_workflow_processed")
        state.llm_model_used = f"{GEMINI_MODEL} + {GPT_MODEL}"
        
        logger.info("Shopper workflow processed successfully")
        
    except Exception as e:
        logger.error(f"Error in shopper workflow: {str(e)}")
        state.assistant_message = "I'd love to help you create a showroom for your customer! Can you tell me what your customer is looking for?"
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


__all__ = ["shopper_showroom_workflow_node"]