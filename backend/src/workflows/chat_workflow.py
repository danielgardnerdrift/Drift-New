"""
LangGraph workflow for Drift chat processing.

This workflow replaces the n8n workflow functionality, providing
intelligent chat processing, data extraction, and response generation
for the Drift vehicle showroom creation platform.
"""

import os
import logging
from typing import Dict, Any, List

from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from langchain_openai import ChatOpenAI
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_core.messages import HumanMessage, SystemMessage

from ..models.schemas import WorkflowState

logger = logging.getLogger(__name__)

# Model configurations
GPT_MODEL = "gpt-3.5-turbo"  # For routing and general chat
GEMINI_MODEL = "gemini-1.5-flash"  # For data extraction


def create_chat_workflow():
    """
    Create and configure the LangGraph workflow for chat processing.
    
    Returns:
        Compiled LangGraph workflow
    """
    
    # Define the state graph
    workflow = StateGraph(WorkflowState)
    
    # Add nodes
    workflow.add_node("classify_intent", classify_intent_node)
    workflow.add_node("extract_data", extract_data_node)
    workflow.add_node("generate_response", generate_response_node)
    workflow.add_node("determine_next_step", determine_next_step_node)
    
    # Define edges
    workflow.add_edge(START, "classify_intent")
    workflow.add_conditional_edges(
        "classify_intent",
        route_after_intent,
        {
            "extract_data": "extract_data",
            "general_chat": "generate_response",
            "end_conversation": "determine_next_step"
        }
    )
    workflow.add_edge("extract_data", "generate_response")
    workflow.add_edge("generate_response", "determine_next_step")
    workflow.add_edge("determine_next_step", END)
    
    # Compile the workflow with memory
    memory = MemorySaver()
    app = workflow.compile(checkpointer=memory)
    
    return app


async def classify_intent_node(state: WorkflowState) -> WorkflowState:
    """
    Classify the user's intent using GPT-3.5-turbo.
    
    Determines if the message is:
    - data_collection: User providing vehicle/business information
    - general_chat: General conversation or questions
    - end_conversation: User wants to finish or has provided all info
    """
    logger.info("Classifying user intent...")
    
    try:
        # Initialize GPT model for intent classification
        llm = ChatOpenAI(
            model=GPT_MODEL,
            temperature=0.1,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # System prompt for intent classification
        system_prompt = """You are an expert at classifying user intents for a vehicle showroom creation platform.

Classify the user's message into one of these categories:

1. **data_collection**: User is providing information about vehicles, business details, or answering questions about their showroom needs
2. **general_chat**: User is asking general questions, making small talk, or needs clarification
3. **end_conversation**: User indicates they're done, satisfied, or want to end the conversation

Respond with ONLY the category name (data_collection, general_chat, or end_conversation).

Examples:
- "I have a 2020 Honda Civic for sale" → data_collection
- "What kind of information do you need?" → general_chat  
- "That's all I have, thanks!" → end_conversation
- "I run a BMW dealership in Dallas" → data_collection
- "How does this work?" → general_chat
- "I'm done for now" → end_conversation"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.user_query)
        ]
        
        result = await llm.ainvoke(messages)
        intent = result.content.strip().lower()
        
        # Validate intent
        valid_intents = ["data_collection", "general_chat", "end_conversation"]
        if intent not in valid_intents:
            intent = "general_chat"  # Default fallback
        
        state.intent = intent
        state.processing_steps.append(f"Intent classified as: {intent}")
        state.model_used = GPT_MODEL
        
        logger.info(f"Intent classified as: {intent}")
        
    except Exception as e:
        logger.error(f"Error in intent classification: {str(e)}")
        state.intent = "general_chat"  # Safe fallback
        state.processing_steps.append(f"Intent classification failed, defaulting to general_chat")
    
    return state


def route_after_intent(state: WorkflowState) -> str:
    """Route based on classified intent."""
    intent = state.intent
    
    if intent == "data_collection":
        return "extract_data"
    elif intent == "end_conversation":
        return "end_conversation"
    else:
        return "general_chat"


async def extract_data_node(state: WorkflowState) -> WorkflowState:
    """
    Extract structured data from user message using Gemini.
    
    Uses Gemini for its superior data extraction capabilities.
    """
    logger.info("Extracting structured data...")
    
    try:
        # Initialize Gemini model for data extraction
        llm = ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0,
            api_key=os.getenv("GOOGLE_AI_API_KEY")
        )
        
        # System prompt for data extraction
        system_prompt = """You are a data extraction specialist for a vehicle showroom creation platform.

Extract relevant information from the user's message and return it as JSON.

Extract these categories when mentioned:

**Vehicle Information:**
- make, model, year, trim, color, mileage, vin, price_range

**Customer Information:**
- name, email, phone, preferred_contact_method, location, budget, timeframe

**Business Information:**
- business_name, showroom_type (virtual/physical/hybrid), inventory_size, specializations, target_market, services_offered

**Only include fields that are explicitly mentioned or can be reasonably inferred.**

Return ONLY valid JSON in this format:
{
  "vehicle": {"make": "Honda", "model": "Civic", "year": 2020},
  "customer": {"location": "Dallas", "budget": "25000-30000"},  
  "business": {"showroom_type": "virtual", "inventory_size": "50-100"}
}

If no relevant data is found, return: {"extracted": false}"""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=f"Extract data from: {state.user_query}")
        ]
        
        result = await llm.ainvoke(messages)
        
        # Parse the JSON response
        try:
            import json
            extracted_data = json.loads(result.content.strip())
            
            if extracted_data.get("extracted") is not False:
                # Merge with existing collected data
                for category, data in extracted_data.items():
                    if category in state.collected_data:
                        state.collected_data[category].update(data)
                    else:
                        state.collected_data[category] = data
                
                state.processing_steps.append(f"Extracted data: {list(extracted_data.keys())}")
                logger.info(f"Successfully extracted data: {extracted_data}")
            else:
                state.processing_steps.append("No relevant data found to extract")
                
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON from Gemini response: {result.content}")
            state.processing_steps.append("Data extraction failed - invalid JSON")
    
    except Exception as e:
        logger.error(f"Error in data extraction: {str(e)}")
        state.processing_steps.append(f"Data extraction error: {str(e)}")
    
    return state


async def generate_response_node(state: WorkflowState) -> WorkflowState:
    """
    Generate appropriate response using GPT-3.5-turbo.
    
    Creates contextual responses based on intent and collected data.
    """
    logger.info("Generating response...")
    
    try:
        # Initialize GPT model for response generation
        llm = ChatOpenAI(
            model=GPT_MODEL,
            temperature=0.7,
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Build context from collected data
        data_summary = ""
        if state.collected_data:
            data_summary = f"\nCollected data so far: {state.collected_data}"
        
        # System prompt for response generation
        system_prompt = f"""You are a helpful assistant for a vehicle showroom creation platform called Drift.

Your role is to help users create virtual showrooms for their vehicles or dealerships.

Context:
- User intent: {state.intent}
- User query: {state.user_query}{data_summary}

Generate a helpful, conversational response that:
1. Acknowledges what the user said
2. If data was collected, confirm what you understood
3. Keep the conversation moving forward naturally
4. Be encouraging and professional
5. Ask follow-up questions when appropriate

Keep responses concise (2-3 sentences max) and natural."""

        messages = [
            SystemMessage(content=system_prompt),
            HumanMessage(content=state.user_query)
        ]
        
        result = await llm.ainvoke(messages)
        state.response_message = result.content.strip()
        state.processing_steps.append("Response generated")
        
        logger.info("Response generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating response: {str(e)}")
        state.response_message = "I'm here to help you create your vehicle showroom. Could you tell me more about what you're looking for?"
        state.processing_steps.append(f"Response generation failed: {str(e)}")
    
    return state


async def determine_next_step_node(state: WorkflowState) -> WorkflowState:
    """
    Determine if conversation should continue and what to ask next.
    """
    logger.info("Determining next steps...")
    
    try:
        # Simple logic to determine if conversation is complete
        # In a real implementation, this could be more sophisticated
        
        if state.intent == "end_conversation":
            state.conversation_complete = True
            state.next_question = None
        else:
            # Analyze collected data to suggest next questions
            missing_info = []
            
            if not state.collected_data.get("vehicle"):
                missing_info.append("vehicle information")
            if not state.collected_data.get("business"):
                missing_info.append("business details")
            
            if missing_info and state.intent == "data_collection":
                state.next_question = f"Could you also share some {missing_info[0]}?"
            else:
                state.next_question = "Is there anything else you'd like to add?"
            
            state.conversation_complete = len(missing_info) == 0
        
        state.processing_steps.append(f"Conversation complete: {state.conversation_complete}")
        
    except Exception as e:
        logger.error(f"Error determining next steps: {str(e)}")
        state.conversation_complete = False
        state.next_question = "How else can I help you?"
    
    return state