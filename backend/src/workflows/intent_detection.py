"""
Intent Detection Node for LangGraph Drift Service.

This module implements the Intent Detection node that routes user queries 
to appropriate workflows based on the Drift PRD specifications.

Uses GPT-3.5-turbo for cost efficiency as specified in the PRD.
"""

import os
import json
import logging
from typing import Dict, Any, Optional
from langchain_core.messages import SystemMessage, HumanMessage
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from ..models.schemas import IntentRoute, ConversationState

logger = logging.getLogger(__name__)


class IntentDetectionNode:
    """
    LangGraph node for detecting user intent and routing to appropriate workflows.
    
    Based on LangGraph patterns for structured output and routing decisions.
    Uses GPT-3.5-turbo for cost optimization as specified in PRD.
    """
    
    def __init__(self):
        """Initialize the Intent Detection Node with GPT-3.5-turbo."""
        # Use GPT-3.5-turbo for cost efficiency as specified in PRD
        api_key = os.getenv("OPENAI_API_KEY")
        self.llm = ChatOpenAI(
            model="gpt-3.5-turbo",
            temperature=0.1,  # Low temperature for consistent routing
            api_key=SecretStr(api_key) if api_key else None
        )
        
        # Bind structured output schema for intent routing
        self.router = self.llm.with_structured_output(IntentRoute)
        
        # Cache for similar queries (simple in-memory cache)
        self._intent_cache: Dict[str, IntentRoute] = {}
        
    def _get_intent_prompt(self) -> str:
        """
        Get the system prompt for intent detection.
        
        Based on Drift PRD workflow specifications.
        """
        return """You are an intelligent routing assistant for Drift, a B2B SaaS platform for automotive dealership salespeople.

CRITICAL CONTEXT: ALL users are dealership salespeople. They use Drift to create personalized vehicle showrooms FOR their customers. This is a B2B2C model where:
- Drift serves dealerships (B2B)
- Dealerships serve customers (B2C)
- All users are salespeople creating showrooms for their customers

Your job is to analyze salesperson messages and route them to the correct workflow:

**Workflow 1 (General)**: Route here when salespeople are:
- Asking general questions about how Drift works
- Requesting support or help with the platform
- Making small talk or unclear requests
- Asking about platform features or pricing
- Having technical issues

**Workflow 2 (Shopper Showroom)**: Route here when salespeople are:
- Creating a showroom FOR a customer who is shopping for a vehicle
- Setting up a personalized experience for a specific customer
- Mentioning customer names, customer preferences, or customer needs
- Saying things like "my customer wants", "create a showroom for", "customer is looking for"
- Collecting data to personalize a customer's vehicle shopping experience

**Workflow 3 (Personal Showroom)**: Route here when salespeople are:
- Creating their own personal vehicle showcase (like a digital business card)
- Building their personal collection of favorite vehicles to show customers
- Creating a showcase of their top vehicle picks
- Setting up their individual salesperson profile with preferred vehicles

**Key Detection Patterns:**
- Shopper Showroom signals: "my customer", "for [customer name]", "customer wants", "create showroom for", "customer is looking"
- Personal Showroom signals: "my showroom", "my personal", "my favorite vehicles", "my top picks", "my vehicle showcase"
- General signals: "how does this work", "help", "support", "what can Drift do", greetings

**Entity Extraction:**
Extract relevant entities like customer names, vehicle preferences, dealership info, salesperson details.

Provide a confidence score based on how clear the intent is:
- 0.9-1.0: Very clear intent with strong signals
- 0.7-0.8: Moderately clear intent
- 0.5-0.6: Somewhat unclear, best guess
- 0.3-0.4: Very unclear, defaulting to general

Always provide reasoning for your routing decision."""

    def _extract_cache_key(self, user_query: str) -> str:
        """Generate a cache key for the user query."""
        # Simple cache key based on normalized query
        return user_query.lower().strip()[:100]
    
    def _extract_salesperson_patterns(self, user_query: str) -> Dict[str, Any]:
        """
        Extract salesperson-specific language patterns to improve intent classification.
        
        Args:
            user_query: The salesperson's message
            
        Returns:
            Dictionary of detected patterns and entities
        """
        query_lower = user_query.lower()
        patterns = {
            "customer_references": [],
            "workflow_signals": [],
            "confidence_boost": 0.0
        }
        
        # Customer reference patterns (strong signal for Workflow 2)
        customer_patterns = [
            "my customer", "my client", "customer wants", "customer needs", 
            "customer is looking", "client is looking", "for my customer",
            "customer who", "client who", "customer named", "client named",
            "create a showroom for", "build a showroom for", "showroom for"
        ]
        
        for pattern in customer_patterns:
            if pattern in query_lower:
                patterns["customer_references"].append(pattern)
                patterns["workflow_signals"].append(2)  # Shopper Showroom
                patterns["confidence_boost"] += 0.1
        
        # Personal showroom patterns (strong signal for Workflow 3)
        personal_patterns = [
            "my showroom", "my personal", "my favorite vehicles",
            "my top picks", "my vehicle showcase", "my own showroom",
            "personal showcase", "my preferred vehicles"
        ]
        
        for pattern in personal_patterns:
            if pattern in query_lower:
                patterns["workflow_signals"].append(3)  # Personal Showroom
                patterns["confidence_boost"] += 0.1
        
        # General/support patterns (signal for Workflow 1)
        support_patterns = [
            "how does", "how do i", "what is", "what are", "help me understand",
            "can you explain", "i need help", "technical issue", "problem with"
        ]
        
        for pattern in support_patterns:
            if pattern in query_lower:
                patterns["workflow_signals"].append(1)  # General
                patterns["confidence_boost"] += 0.05
        
        # Extract customer names (helps with entity extraction)
        import re
        name_patterns = re.findall(r"(?:customer|client) (?:named |called )?([A-Z][a-z]+ ?[A-Z]?[a-z]*)", user_query)
        if name_patterns:
            patterns["customer_names"] = name_patterns
            patterns["confidence_boost"] += 0.05
        
        return patterns
    
    async def detect_intent(self, state: ConversationState) -> ConversationState:
        """
        Detect user intent and route to appropriate workflow.
        
        Args:
            state: Current conversation state
            
        Returns:
            Updated ConversationState with intent detection results
        """
        try:
            user_query = state.user_query
            cache_key = self._extract_cache_key(user_query)
            
            # Extract salesperson patterns for enhanced classification
            salesperson_patterns = self._extract_salesperson_patterns(user_query)
            if salesperson_patterns is None:
                salesperson_patterns = {}
            
            # Check cache first
            if cache_key in self._intent_cache:
                logger.info(f"Cache hit for query: {user_query[:50]}...")
                intent_result = self._intent_cache[cache_key]
            else:
                # Run intent detection with LLM
                logger.info(f"Running intent detection for: {user_query[:50]}...")
                
                intent_result = await self._run_intent_detection(user_query, salesperson_patterns)
                
                # Cache the result
                self._intent_cache[cache_key] = intent_result
                
                # Keep cache size reasonable (simple LRU)
                if len(self._intent_cache) > 100:
                    # Remove oldest entry
                    oldest_key = next(iter(self._intent_cache))
                    del self._intent_cache[oldest_key]
            
            # Update state with intent detection results
            state_dict = state.model_dump()
            state_dict['collected_data'] = {}
            updated_state = ConversationState(**state_dict)
            updated_state.workflow_id = intent_result.workflow_id
            updated_state.intent_confidence = intent_result.confidence
            updated_state.intent_reasoning = intent_result.reasoning
            updated_state.llm_model_used = "gpt-3.5-turbo"
            updated_state.processing_steps.append("intent_detection")
            
            # Ensure collected_data is always a dict
            if updated_state.collected_data is None:
                updated_state.collected_data = {}
            entities = intent_result.extracted_entities if intent_result.extracted_entities is not None else {}
            if isinstance(entities, dict) and entities:
                updated_state.collected_data.update(entities)
            
            logger.info(
                f"Intent detected: workflow_id={intent_result.workflow_id}, "
                f"confidence={intent_result.confidence:.2f}, "
                f"reasoning={intent_result.reasoning[:100]}..."
            )
            
            return updated_state
            
        except Exception as e:
            logger.error(f"Error in intent detection: {str(e)}", exc_info=True)
            
            # Fallback to general workflow on error
            state_dict = state.model_dump()
            state_dict['collected_data'] = {}
            updated_state = ConversationState(**state_dict)
            updated_state.workflow_id = 1  # Default to general
            updated_state.intent_confidence = 0.0
            updated_state.intent_reasoning = f"Error in intent detection: {str(e)}"
            updated_state.error = str(e)
            updated_state.processing_steps.append("intent_detection_error")
            
            return updated_state
    
    async def _run_intent_detection(self, user_query: str, patterns: Optional[Dict[str, Any]] = None) -> IntentRoute:
        """
        Run the actual intent detection using the LLM with enhanced pattern analysis.
        
        Args:
            user_query: User's message to analyze
            patterns: Extracted salesperson patterns for enhanced classification
            
        Returns:
            IntentRoute with workflow_id and metadata
        """
        # Ensure patterns is always a dict
        if patterns is None:
            patterns = {}
        # Build enhanced prompt with pattern analysis
        pattern_context = ""
        if patterns:
            if patterns.get("customer_references"):
                pattern_context += f"\n\nDETECTED CUSTOMER REFERENCES: {', '.join(patterns['customer_references'])}"
            if patterns.get("workflow_signals"):
                most_common_signal = max(set(patterns["workflow_signals"]), key=patterns["workflow_signals"].count)
                pattern_context += f"\nSTRONGEST WORKFLOW SIGNAL: {most_common_signal}"
            if patterns.get("customer_names"):
                pattern_context += f"\nCUSTOMER NAMES DETECTED: {', '.join(patterns['customer_names'])}"
        
        enhanced_message = f"Salesperson message: {user_query}{pattern_context}"
        
        messages = [
            SystemMessage(content=self._get_intent_prompt()),
            HumanMessage(content=enhanced_message)
        ]
        
        # Invoke the LLM with structured output
        result = await self.router.ainvoke(messages)
        
        # If result is a dict, convert to IntentRoute
        if isinstance(result, dict):
            result = IntentRoute(**result)
            
        # Apply confidence boost from pattern analysis
        if patterns and patterns.get("confidence_boost", 0) > 0:
            confidence_boost = min(patterns["confidence_boost"], 0.3)  # Cap at 30% boost
            result.confidence = min(result.confidence + confidence_boost, 1.0)
            
            # Update reasoning to include pattern analysis
            if patterns.get("customer_references") or patterns.get("customer_names"):
                result.reasoning += f" Pattern analysis detected clear customer references, boosting confidence."
        
        return result
    
    def route_to_workflow(self, state: ConversationState) -> str:
        """
        Route to the next workflow node based on detected intent.
        
        This is used as a conditional edge function in LangGraph.
        
        Args:
            state: Current conversation state with workflow_id set
            
        Returns:
            Node name to route to
        """
        workflow_id = state.workflow_id
        
        if workflow_id == 1:
            return "general_workflow"
        elif workflow_id == 2:
            return "shopper_showroom_workflow"
        elif workflow_id == 3:
            return "personal_showroom_workflow"
        else:
            # Fallback to general if no valid workflow_id
            logger.warning(f"Invalid workflow_id: {workflow_id}, defaulting to general")
            return "general_workflow"


# LangGraph node function wrapper
async def intent_detection_node(state: ConversationState) -> ConversationState:
    """LangGraph node for intent detection using ConversationState."""
    # ALWAYS detect intent from the message, just like n8n does
    # This allows users to switch workflows mid-conversation
    logger.info(f"Running intent detection (incoming workflow_id: {state.workflow_id})")
    node = IntentDetectionNode()
    # Run detection and update state
    return await node.detect_intent(state)


# Conditional edge function for LangGraph routing
def route_by_intent(state: ConversationState) -> str:
    """Route to the correct workflow based on ConversationState.workflow_id."""
    workflow_id = getattr(state, "workflow_id", 1)
    if workflow_id == 2:
        return "shopper_showroom_workflow"
    elif workflow_id == 3:
        return "personal_showroom_workflow"
    else:
        return "general_workflow"