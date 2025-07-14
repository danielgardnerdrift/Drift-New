"""
LangGraph workflow for Drift chat processing.

This workflow replaces the n8n workflow functionality, providing
intelligent chat processing, data extraction, and response generation
for the Drift vehicle showroom creation platform.

NOTE: The main workflow orchestration has been moved to routing.py
This file now serves as a compatibility layer and re-exports the
necessary functions.
"""
"""
CRITICAL WORKFLOW DEFINITIONS - DO NOT CHANGE:
- Workflow 1: general_workflow - Salesperson general chat
- Workflow 2: shopper_showroom_workflow - Salesperson creates FOR customer
- Workflow 3: personal_showroom_workflow - Salesperson's own showcase

BANNED TERMS: These terms should NEVER appear in the codebase
If you see these terms, they are BUGS.
"""

# Re-export the main workflow creation function from routing module
from .routing import create_chat_workflow

# For backward compatibility, also export the workflow creation function
__all__ = ["create_chat_workflow"]