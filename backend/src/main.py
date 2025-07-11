"""
FastAPI application for LangGraph-based Drift chat workflow service.

This service replaces the n8n webhook URL called from Xano's /chat/message_complete endpoint.
It processes chat requests using LangGraph and calls back to Xano's data collection webhook.
"""

import os
import logging
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
import aiohttp
from dotenv import load_dotenv

from .workflows.chat_workflow import create_chat_workflow
from .models.schemas import ChatRequest, ChatResponse, HealthResponse

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


@app.post("/webhook/chat", response_model=ChatResponse)
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
        
        # Process request through LangGraph workflow
        workflow_input = {
            "user_query": request.user_query,
            "conversation_id": request.conversation_id,
            "user_id": request.user_id,
            "session_id": request.chat_user_session_id,
            "visitor_ip": request.visitor_ip_address,
            "additional_context": request.additional_context or {}
        }
        
        # Run LangGraph workflow
        result = await chat_workflow.ainvoke(workflow_input)
        
        # Call Xano data collection webhook with the processed data
        await call_xano_webhook(result.get("collected_data", {}))
        
        # Return response for Xano
        return ChatResponse(
            success=True,
            message=result.get("response_message", ""),
            collected_data=result.get("collected_data", {}),
            next_question=result.get("next_question"),
            conversation_complete=result.get("conversation_complete", False)
        )
        
    except Exception as e:
        logger.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to process chat request: {str(e)}"
        )


async def call_xano_webhook(collected_data: Dict[str, Any]) -> None:
    """
    Call Xano's data collection webhook with processed data.
    
    This replaces the 'save data to xano' node that was in the n8n workflow.
    
    Args:
        collected_data: Dictionary of collected data to send to Xano
    """
    webhook_url = os.getenv("XANO_WEBHOOK_URL")
    if not webhook_url:
        logger.warning("XANO_WEBHOOK_URL not configured, skipping webhook call")
        return
    
    try:
        logger.info("Calling Xano data collection webhook...")
        
        async with http_session.post(
            webhook_url,
            json=collected_data,
            headers={"Content-Type": "application/json"}
        ) as response:
            if response.status == 200:
                logger.info("Successfully called Xano webhook")
            else:
                logger.error(f"Xano webhook call failed with status {response.status}")
                
    except Exception as e:
        logger.error(f"Error calling Xano webhook: {str(e)}")
        # Don't raise here as this is a side effect, not critical to main flow


@app.get("/")
async def root():
    """Root endpoint with service information."""
    return {
        "service": "Drift LangGraph Service", 
        "status": "running",
        "version": "1.0.0",
        "endpoints": [
            "/health - Health check",
            "/webhook/chat - Process chat requests from Xano"
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