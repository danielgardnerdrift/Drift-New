"""
Personal showroom workflow node for handling salesperson's vehicle showcase.

This workflow (workflow_id = 3) handles the case where a salesperson is
creating their own personal vehicle showcase (like a digital business card).
"""
import os
import json
import logging
from typing import Dict, Any, Optional

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


async def personal_showroom_workflow_node(state: ConversationState) -> ConversationState:
    """
    Handle personal showroom creation (Workflow 3).
    
    This node processes messages where a salesperson is creating their own
    personal vehicle showcase with their favorite vehicles.
    
    Args:
        state: Current conversation state
        
    Returns:
        Updated conversation state with extracted data and response
    """
    logger.info("Processing personal showroom workflow...")
    
    try:
        # Use Gemini for data extraction
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0,
            api_key=get_secret("GOOGLE_AI_API_KEY")
        )
        
        # Extract personal showroom data from salesperson
        extraction_prompt = """Extract salesperson's personal vehicle showcase information from their message.

CONTEXT: The salesperson is creating their own personal vehicle showcase (like a digital business card with their favorite vehicles).

Extract and return JSON with these fields when mentioned:
{
  "dealershipwebsite_url": "salesperson's dealership website URL",
  "vehicledetailspage_urls": ["URLs of specific vehicles they want to showcase"],
  "user_name": "salesperson's name",
  "user_phone": "salesperson's phone number",
  "user_email": "salesperson's email",
  "vehiclesearchpreference": [{
    "make": "vehicle make",
    "model": "vehicle model",
    "year_min": minimum_year,
    "year_max": maximum_year,
    "price_min": minimum_price,
    "price_max": maximum_price,
    "body_style": "SUV/sedan/truck/etc",
    "condition": ["New", "Used", "Certified"]
  }]
}

Only include fields that are explicitly mentioned. Return {"extracted": false} if no relevant data found."""

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
                
                # Directly merge fields (not nested in categories)
                for field, value in extracted_data.items():
                    if field != "extracted":
                        state.collected_data[field] = value
                
                state.processing_steps.append(f"personal_showroom_data_extracted: {list(extracted_data.keys())}")
        
        except json.JSONDecodeError:
            logger.error(f"Failed to parse personal showroom data JSON: {content}")
            state.processing_steps.append("personal_showroom_data_extraction_failed")
        
        # Generate contextual response using n8n-style active prompting
        data_context = json.dumps(getattr(state, "collected_data", {}), indent=2)
        newly_collected = getattr(state, "newly_collected_fields", [])
        current_field = getattr(state, "current_field", None)
        workflow_status = getattr(state, "workflow_status", "active")
        
        response_prompt = f"""Generate a conversational response following this EXACT pattern:

Current Context:
- Workflow Status: {workflow_status}
- Newly Collected Fields: {newly_collected}
- Next Priority Field: {current_field}
- All Collected Data: {data_context}

CRITICAL INSTRUCTIONS - Follow this response pattern EXACTLY:

1. **Acknowledge what you collected** (if any new data was extracted):
   - Confirm the specific information just provided
   - Be enthusiastic about their vehicle choices
   
2. **Ask for the next priority field** (if there is one):
   - Focus on ONLY the field specified in "Next Priority Field"
   - Be specific and direct about what you need
   - For vehicle URLs, explain: "Please share the specific webpage URLs for the vehicles you want to showcase in your personal showroom"
   
3. **Be encouraging and specific**:
   - Express enthusiasm about their personal showcase
   - Explain how this helps them connect with customers
   - Use conversational, friendly tone

IMPORTANT RULES:
- NEVER ask for multiple fields at once - focus ONLY on the next priority field
- NEVER provide a list of all required fields upfront
- Address them as a salesperson building their personal vehicle showcase
- Be excited about their vehicle preferences

Example Response Pattern:
"Excellent! I've captured [specific data acknowledged]. To continue building your personal vehicle showcase, I'll need [next priority field with helpful context]. [Encouraging statement about how this helps with customer engagement]"

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
        
        state.processing_steps.append("personal_showroom_workflow_processed")
        state.llm_model_used = f"{GEMINI_MODEL} + {GPT_MODEL}"
        
        logger.info("Personal showroom workflow processed successfully")
        
    except Exception as e:
        logger.error(f"Error in personal showroom workflow: {str(e)}")
        state.assistant_message = "I'd love to help you create your personal vehicle showcase! What are some of your favorite vehicles you'd like to feature?"
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


__all__ = ["personal_showroom_workflow_node"]