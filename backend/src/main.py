"""
FastAPI application for LangGraph-based Drift chat workflow service.

This service replaces the n8n webhook URL called from Xano's /chat/message_complete endpoint.
It processes chat requests using LangGraph and calls back to Xano's data collection webhook.
"""

import os
import logging
import asyncio
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
import aiohttp
from dotenv import load_dotenv
import json

from .workflows.chat_workflow import create_chat_workflow
from .models.schemas import ChatRequest, ChatResponse, HealthResponse, N8nWebhookResponse

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Global variables for async resources
http_session: aiohttp.ClientSession = None
chat_workflow = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifecycle - startup and shutdown."""
    global http_session, chat_workflow
    
    # Startup
    logger.info("Starting LangGraph Drift service...")
    
    # Create HTTP session for external API calls
    http_session = aiohttp.ClientSession()
    
    # Initialize LangGraph workflow
    chat_workflow = create_chat_workflow()
    
    logger.info("LangGraph Drift service started successfully")
    
    yield
    
    # Shutdown
    logger.info("Shutting down LangGraph Drift service...")
    
    if http_session:
        await http_session.close()
    
    logger.info("LangGraph Drift service shut down successfully")


# Create FastAPI app with lifespan management
app = FastAPI(
    title="Drift LangGraph Service",
    description="LangGraph-based workflow service for Drift chat functionality",
    version="1.0.0",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure appropriately for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    return HealthResponse(
        status="healthy",
        service="drift-langgraph",
        version="1.0.0"
    )


@app.post("/webhook/chat")
async def process_chat_request(request: ChatRequest):
    """
    Process chat request from Xano's /chat/message_complete endpoint.
    
    This endpoint replaces the n8n webhook URL that was previously called
    from step 15 of Xano's chat endpoint.
    
    Args:
        request: Chat request data from Xano
        
    Returns:
        ChatResponse: Processed response to send back to Xano
    """
    try:
        logger.info(f"Processing chat request for query: {request.user_query[:100]}...")
        
        # Log the incoming request to see what Xano is sending
        logger.info(f"Incoming request data: {request.model_dump()}")
        
        # Initialize the conversation state with data from Xano
        from .models.schemas import ConversationState
        
        initial_state = ConversationState(
            user_query=request.user_query,
            conversation_id=request.conversation_id,
            user_id=request.user_id,
            session_id=request.session_id,
            visitor_ip=request.visitor_ip_address,
            workflow_id=request.workflow_id or 1,
            workflow_status=request.workflow_status or "active",
            current_field=request.next_field,
            completed_fields=request.collected_fields or [],
            # CRITICAL: collected_data starts empty - we only collect NEW data from this message
            collected_data={}
        )
        
        # Run LangGraph workflow with thread_id for checkpointer
        config = {
            "configurable": {
                "thread_id": f"conversation_{request.conversation_id or 'new'}"
            }
        }
        result = await chat_workflow.ainvoke(initial_state.model_dump(), config)
        
        # Extract workflow state from result
        workflow_state = result
        
        # Build n8n-compatible response body
        response_body = N8nWebhookResponse(
            role="assistant",
            content=workflow_state.get("assistant_message", ""),
            workflow_id=workflow_state.get("workflow_id", 1),
            workflow_status=workflow_state.get("workflow_status", "active"),
            collected_data=workflow_state.get("collected_data", {}),
            newly_collected_data=workflow_state.get("newly_collected_fields", []),
            next_field=workflow_state.get("current_field")
        )
        
        # CRITICAL: Call Xano data collection webhook AFTER EVERY MESSAGE
        # This is what n8n was doing - save the collected data to Xano
        if request.conversation_id:
            # Extract the fields that were actually collected this message
            newly_collected = workflow_state.get("newly_collected_fields", [])
            
            # n8n sends field names as an array, not the values
            webhook_data = {
                "conversation_id": request.conversation_id,
                "newly_collected_data": newly_collected,  # Array of field names
                "collected_data": workflow_state.get("collected_data", {}),
                "next_field": workflow_state.get("current_field"),
                "workflow_id": workflow_state.get("workflow_id", 1),
                "workflow_status": workflow_state.get("workflow_status", "active"),
                "role": "assistant",
                "content": workflow_state.get("assistant_message", "")
            }
            
            # Call the webhook asynchronously
            asyncio.create_task(call_xano_data_webhook(webhook_data))
            logger.info(f"Scheduled data collection webhook call for conversation {request.conversation_id} with newly_collected: {newly_collected}")
        
        # Return in the exact format Xano expects (matching n8n webhook response)
        return {
            "response": {
                "body": response_body.model_dump(),
                "statusCode": 200
            }
        }
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )


async def call_xano_data_webhook(webhook_data: Dict[str, Any]) -> None:
    """
    Call Xano's data collection webhook with processed data.
    
    This replaces the 'save data to xano' node that was in the n8n workflow.
    CRITICAL: This must be called after EVERY message to maintain state in Xano.
    
    Args:
        webhook_data: Dictionary containing all data n8n was sending to Xano
    """
    # Use the hardcoded URL like n8n was doing
    webhook_url = "https://api.autosnap.cloud/api:owKhF9pX/webhook/data_collection_n8n"
    
    try:
        logger.info(f"Calling Xano data collection webhook for conversation {webhook_data.get('conversation_id')}...")
        logger.debug(f"Webhook data: {webhook_data}")
        
        if http_session is None:
            logger.error("HTTP session not initialized, cannot call webhook")
            return
            
        async with http_session.post(
            webhook_url,
            json=webhook_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                response_data = await response.json()
                logger.info(f"Successfully called Xano webhook: {response_data}")
            else:
                error_text = await response.text()
                logger.error(f"Xano webhook call failed with status {response.status}: {error_text}")
                
    except Exception as e:
        logger.error(f"Error calling Xano webhook: {str(e)}")
        # Don't raise here as this is a side effect, not critical to main flow


@app.post("/webhook/chat/stream")
async def process_chat_stream(request: ChatRequest):
    """
    Process chat request from frontend directly (streaming).
    
    This endpoint is called directly from the frontend after Xano forwards the request.
    It streams responses back to the frontend, then calls Xano's webhook at the end.
    
    Args:
        request: Chat request data originally from Xano
        
    Returns:
        StreamingResponse: Server-sent events stream
    """
    async def generate():
        try:
            logger.info(f"Processing streaming chat request for query: {request.user_query[:100]}...")
            
            # Initialize the conversation state
            from .models.schemas import ConversationState
            
            initial_state = ConversationState(
                user_query=request.user_query,
                conversation_id=request.conversation_id,
                user_id=request.user_id,
                session_id=request.session_id,
                visitor_ip=request.visitor_ip_address,
                workflow_id=request.workflow_id or 1,
                workflow_status=request.workflow_status or "active",
                current_field=request.next_field,
                completed_fields=request.collected_fields or [],
                collected_data={}
            )
            
            # Run LangGraph workflow
            config = {
                "configurable": {
                    "thread_id": f"conversation_{request.conversation_id or 'new'}"
                }
            }
            result = await chat_workflow.ainvoke(initial_state.model_dump(), config)
            
            # Extract workflow state
            workflow_state = result
            
            # Stream the response with metadata
            response_data = {
                "role": "assistant",
                "content": workflow_state.get("assistant_message", ""),
                "workflow_id": workflow_state.get("workflow_id", 1),
                "workflow_status": workflow_state.get("workflow_status", "active"),
                "collected_data": workflow_state.get("collected_data", {}),
                "newly_collected_data": workflow_state.get("newly_collected_fields", []),
                "next_field": workflow_state.get("current_field"),
                "conversation_id": request.conversation_id,
                "session_id": request.session_id,
                "has_ui": "[UI_COMPONENT_START]" in workflow_state.get("assistant_message", "")
            }
            
            # Send as SSE event with event type for better parsing
            yield f"event: message\ndata: {json.dumps(response_data)}\nid: {request.conversation_id}-{request.session_id}\n\n"
            
            # Final event to signal completion
            yield f"event: done\ndata: [DONE]\nid: {request.conversation_id}-{request.session_id}\n\n"
            
            # Call Xano webhook after streaming completes
            if request.conversation_id:
                webhook_data = {
                    "conversation_id": request.conversation_id,
                    "newly_collected_data": workflow_state.get("newly_collected_fields", []),
                    "collected_data": workflow_state.get("collected_data", {}),
                    "next_field": workflow_state.get("current_field"),
                    "workflow_id": workflow_state.get("workflow_id", 1),
                    "workflow_status": workflow_state.get("workflow_status", "active"),
                    "role": "assistant",
                    "content": workflow_state.get("assistant_message", "")
                }
                asyncio.create_task(call_xano_data_webhook(webhook_data))
                
        except Exception as e:
            logger.error(f"Error in streaming chat: {str(e)}")
            error_data = {"error": str(e)}
            yield f"data: {json.dumps(error_data)}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"  # Disable Nginx buffering
        }
    )


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Drift LangGraph Service", 
        "status": "running",
        "version": "1.0.0",
        "endpoints": [
            "/health - Health check",
            "/webhook/chat - Process chat requests from Xano",
            "/webhook/chat/stream - Stream chat responses to frontend"
        ]
    }


if __name__ == "__main__":
    import uvicorn
    
    port = int(os.getenv("PORT", 8000))
    
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=port,
        reload=True,
        log_level="info"
    )