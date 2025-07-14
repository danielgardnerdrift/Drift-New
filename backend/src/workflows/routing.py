"""
LangGraph workflow routing and orchestration.

This module manages the workflow state transitions and routing logic
for the Drift chat processing system.
"""
import logging
from typing import Dict, Any

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver

from ..models.schemas import ConversationState
from .intent_detection import intent_detection_node, route_by_intent
from .data_collection import data_collection_node

# Import workflow nodes - these will be imported from their respective modules
from .general_workflow import general_workflow_node
from .shopper_showroom_workflow import shopper_showroom_workflow_node  
from .personal_showroom_workflow import personal_showroom_workflow_node
from .response_generation import generate_response_node, determine_next_step_node

logger = logging.getLogger(__name__)


def create_chat_workflow():
    """
    Create and configure the LangGraph workflow for chat processing.
    
    This function sets up the complete workflow graph with all nodes
    and edges according to the PRD specifications.
    
    Returns:
        Compiled LangGraph workflow with memory persistence
    """
    
    # Define the state graph using ConversationState
    workflow = StateGraph(ConversationState)
    
    # Add all workflow nodes
    workflow.add_node("intent_detection", intent_detection_node)
    workflow.add_node("data_collection", data_collection_node)
    workflow.add_node("general_workflow", general_workflow_node)
    workflow.add_node("shopper_showroom_workflow", shopper_showroom_workflow_node)
    workflow.add_node("personal_showroom_workflow", personal_showroom_workflow_node)
    workflow.add_node("generate_response", generate_response_node)
    workflow.add_node("determine_next_step", determine_next_step_node)
    
    # Define workflow edges
    
    # Entry point: Start with intent detection
    workflow.add_edge(START, "intent_detection")
    
    # Intent detection routes to appropriate workflow
    workflow.add_conditional_edges(
        "intent_detection",
        route_by_intent,
        {
            "general_workflow": "general_workflow",
            "shopper_showroom_workflow": "data_collection", 
            "personal_showroom_workflow": "data_collection"
        }
    )
    
    # Data collection leads to specific workflows
    workflow.add_conditional_edges(
        "data_collection",
        route_after_data_collection,
        {
            "shopper_showroom_workflow": "shopper_showroom_workflow",
            "personal_showroom_workflow": "personal_showroom_workflow"
        }
    )
    
    # All workflows lead to response generation
    workflow.add_edge("general_workflow", "generate_response")
    workflow.add_edge("shopper_showroom_workflow", "generate_response")
    workflow.add_edge("personal_showroom_workflow", "generate_response")
    
    # Response generation leads to next step determination
    workflow.add_edge("generate_response", "determine_next_step")
    
    # Next step determination leads to end
    workflow.add_edge("determine_next_step", END)
    
    # Compile the workflow with memory for state persistence
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)
    
    logger.info("Chat workflow created and compiled successfully")
    
    return app


def route_after_data_collection(state: ConversationState) -> str:
    """
    Route to appropriate workflow after data collection.
    
    This function determines which workflow node to execute
    after data has been collected, based on the workflow_id.
    
    Args:
        state: Current conversation state
        
    Returns:
        Name of the next node to execute
    """
    workflow_id = state.workflow_id
    
    if workflow_id == 2:
        logger.info("Routing to shopper_showroom_workflow after data collection")
        return "shopper_showroom_workflow"
    elif workflow_id == 3:
        logger.info("Routing to personal_showroom_workflow after data collection")
        return "personal_showroom_workflow"
    else:
        # Fallback (shouldn't happen since general goes direct)
        logger.warning(f"Unexpected workflow_id {workflow_id} in data collection routing")
        return "shopper_showroom_workflow"


# TODO: Implement these additional features as specified in Task 8:
# 1. Redis state persistence (currently using MemorySaver)
# 2. Timeout handling for long-running operations
# 3. Metrics collection for performance monitoring
# 4. Enhanced error handling and recovery mechanisms

__all__ = ["create_chat_workflow", "route_after_data_collection"]