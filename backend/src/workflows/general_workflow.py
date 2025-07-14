"""
General workflow node for handling general conversation and support queries.

This workflow (workflow_id = 1) handles general questions about Drift,
technical support, and other non-showroom creation queries.
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


async def general_workflow_node(state: ConversationState) -> ConversationState:
    """
    Handle general conversation and support queries (Workflow 1).
    
    This node processes general questions about Drift, provides support,
    and handles queries that don't involve creating showrooms.
    
    Args:
        state: Current conversation state
        
    Returns:
        Updated conversation state with assistant response
    """
    logger.info("Processing general workflow...")
    
    try:
        # Initialize GPT model for general conversation
        llm = ChatOpenAI(
            model=GPT_MODEL,
            temperature=0.7,
            api_key=get_secret("OPENAI_API_KEY")
        )
        
        system_prompt = """You are a helpful assistant for Drift, a B2B SaaS platform for automotive dealership salespeople.

IMPORTANT: All users are dealership salespeople. Help them with:
- Understanding how Drift works for sales teams
- General questions about creating showrooms for customers
- Technical support and guidance for salespeople
- Explaining features and capabilities for dealership use

Be friendly, informative, and concise. Always address them as salespeople and guide them toward creating showrooms for their customers when appropriate."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.user_query)
        ]
        
        result = await llm.ainvoke(messages)
        
        # Handle result.content robustly
        content = getattr(result, "content", result)
        if isinstance(content, list):
            content = " ".join(str(x) for x in content)
        content_str = str(content)
        
        state.assistant_message = content_str.strip() if hasattr(content_str, "strip") else content_str
        state.processing_steps.append("general_workflow_processed")
        state.llm_model_used = GPT_MODEL
        
        logger.info("General workflow processed successfully")
        
    except Exception as e:
        logger.error(f"Error in general workflow: {str(e)}")
        state.assistant_message = "I'm here to help you as a salesperson! How can I assist you with Drift today?"
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


__all__ = ["general_workflow_node"]