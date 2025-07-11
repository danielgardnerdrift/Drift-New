"""Configuration utilities for the LangGraph Drift service."""

import os
import logging
from typing import Optional

logger = logging.getLogger(__name__)


def get_required_env(key: str) -> str:
    """
    Get required environment variable or raise error.
    
    Args:
        key: Environment variable name
        
    Returns:
        Environment variable value
        
    Raises:
        ValueError: If environment variable is not set
    """
    value = os.getenv(key)
    if not value:
        raise ValueError(f"Required environment variable {key} is not set")
    return value


def get_optional_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get optional environment variable with default.
    
    Args:
        key: Environment variable name
        default: Default value if not set
        
    Returns:
        Environment variable value or default
    """
    return os.getenv(key, default)


def validate_config() -> bool:
    """
    Validate all required configuration.
    
    Returns:
        True if configuration is valid
        
    Raises:
        ValueError: If any required configuration is missing
    """
    try:
        # Check for API keys
        openai_key = get_required_env("OPENAI_API_KEY")
        google_key = get_required_env("GOOGLE_AI_API_KEY")
        
        # Validate API key format (basic check)
        if not openai_key.startswith(("sk-", "sk-proj-")):
            logger.warning("OpenAI API key format appears invalid")
        
        if not google_key:
            logger.warning("Google AI API key appears empty")
        
        # Check webhook URL
        webhook_url = get_optional_env("XANO_WEBHOOK_URL")
        if webhook_url and not webhook_url.startswith(("http://", "https://")):
            logger.warning("XANO_WEBHOOK_URL should start with http:// or https://")
        
        logger.info("Configuration validation passed")
        return True
        
    except ValueError as e:
        logger.error(f"Configuration validation failed: {e}")
        raise