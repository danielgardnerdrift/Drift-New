"""
Drift LangGraph Workflows

This module contains the LangGraph workflow implementations for the Drift SaaS platform.

CRITICAL CONTEXT: 
- ALL users are dealership salespeople
- Drift is a B2B2C platform where salespeople create showrooms FOR their customers
- Three workflows handle different salesperson use cases:
  1. General chat/support (workflow_id=1)
  2. Shopper showroom creation - salespeople creating FOR customers (workflow_id=2)  
  3. Personal showroom creation - salespeople creating their own showcase (workflow_id=3)

This workflow engine replaces the n8n implementation while maintaining exact compatibility
with the existing Xano backend APIs.
"""

# Import main workflow creation function from routing
from .routing import create_chat_workflow, route_after_data_collection

# Import workflow nodes
from .intent_detection import intent_detection_node, route_by_intent
from .data_collection import data_collection_node
from .general_workflow import general_workflow_node
from .shopper_showroom_workflow import shopper_showroom_workflow_node
from .personal_showroom_workflow import personal_showroom_workflow_node
from .response_generation import generate_response_node, determine_next_step_node

__all__ = [
    # Main workflow function
    'create_chat_workflow',
    
    # Routing functions
    'route_after_data_collection',
    'route_by_intent',
    
    # Workflow nodes
    'intent_detection_node',
    'data_collection_node', 
    'general_workflow_node',
    'shopper_showroom_workflow_node',
    'personal_showroom_workflow_node',
    'generate_response_node',
    'determine_next_step_node'
]