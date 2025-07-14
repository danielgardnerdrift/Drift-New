"""
Xano API integration utilities.

This module handles sending validated data to Xano endpoints
with proper error handling and logging.
"""
import os
import logging
import httpx
from typing import Dict, Any, Optional
from ..models.validation import validate_collected_data

logger = logging.getLogger(__name__)


class XanoClient:
    """Client for interacting with Xano API."""
    
    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("XANO_API_URL", "https://api.autosnap.cloud")
        self.webhook_url = os.getenv("XANO_WEBHOOK_URL", f"{self.base_url}/api:owKhF9pX/webhook/data_collection_n8n")
        self.timeout = httpx.Timeout(30.0, connect=10.0)
        
    async def send_to_xano(self, data: Dict[str, Any], workflow_id: int) -> Dict[str, Any]:
        """
        Send validated data to Xano API.
        
        Args:
            data: The data to send (should already be validated)
            workflow_id: The workflow ID (2 or 3)
            
        Returns:
            Response from Xano API
            
        Raises:
            httpx.HTTPError: If the API request fails
            ValueError: If data validation fails
        """
        # Validate data one final time before sending
        try:
            validated_data = validate_collected_data(data, workflow_id)
        except Exception as e:
            logger.error(f"Final validation failed before Xano submission: {e}")
            raise ValueError(f"Data validation failed: {str(e)}")
        
        # Prepare request payload
        payload = {
            "workflow_id": workflow_id,
            "collected_data": validated_data,
            "source": "langgraph"
        }
        
        # Send to Xano
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                logger.info(f"Sending data to Xano webhook: {self.webhook_url}")
                response = await client.post(
                    self.webhook_url,
                    json=payload,
                    headers={
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    }
                )
                response.raise_for_status()
                
                result = response.json()
                logger.info(f"Successfully sent data to Xano. Response: {result}")
                return result
                
            except httpx.HTTPStatusError as e:
                logger.error(f"Xano API returned error status: {e.response.status_code} - {e.response.text}")
                raise
            except httpx.RequestError as e:
                logger.error(f"Error connecting to Xano API: {e}")
                raise
            except Exception as e:
                logger.error(f"Unexpected error sending to Xano: {e}")
                raise


# Singleton instance
xano_client = XanoClient()


async def send_collected_data_to_xano(data: Dict[str, Any], workflow_id: int) -> Dict[str, Any]:
    """
    Convenience function to send collected data to Xano.
    
    Args:
        data: The collected data to send
        workflow_id: The workflow ID (2 or 3)
        
    Returns:
        Response from Xano API
    """
    return await xano_client.send_to_xano(data, workflow_id)


__all__ = ["XanoClient", "send_collected_data_to_xano"]