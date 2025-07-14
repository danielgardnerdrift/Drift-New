import os
import logging
from typing import Any, Dict, Optional
from langchain_google_genai import ChatGoogleGenerativeAI
from ..models.schemas import ConversationState
from ..models.validation import validate_collected_data
from pydantic import ValidationError, SecretStr

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"

# FIELD_DESCRIPTIONS: Maps field names to human-readable descriptions for prompts.
FIELD_DESCRIPTIONS = {
    "dealershipwebsite_url": "your dealership website URL",
    "shopper_name": "your customer's name",
    "user_name": "your name",
    "user_phone": "your phone number",
    "user_email": "your email",
    "vehicledetailspage_urls": "specific vehicle page URLs",
    "vehiclesearchpreference": "vehicle preferences"
}

class DataCollectionNode:
    def __init__(self, llm_client=None):
        api_key = os.getenv("GOOGLE_AI_API_KEY")
        self.llm = llm_client or ChatGoogleGenerativeAI(
            model=GEMINI_MODEL,
            temperature=0,
            api_key=SecretStr(api_key) if api_key is not None else None
        )
        self.model = GEMINI_MODEL

    async def collect_data(self, state: ConversationState) -> ConversationState:
        workflow_id = state.workflow_id
        user_query = state.user_query
        logger.info(f"DataCollectionNode: workflow_id={workflow_id}, user_query={user_query}")

        if workflow_id == 1:
            # No data collection for general workflow
            logger.info("No data collection required for general workflow.")
            return state

        # Build extraction prompt based on workflow with n8n-style context
        if workflow_id == 2:
            extraction_prompt = self._shopper_showroom_prompt_v2(state)
        elif workflow_id == 3:
            extraction_prompt = self._personal_showroom_prompt_v2(state)
        else:
            logger.warning(f"Unknown workflow_id: {workflow_id}, skipping data extraction.")
            return state

        messages = [
            {"role": "system", "content": extraction_prompt},
            {"role": "user", "content": user_query}
        ]
        try:
            logger.info(f"Sending extraction request to LLM...")
            result = await self.llm.ainvoke(messages)
            import json
            # Handle result.content as str or list
            content = getattr(result, "content", result)
            if isinstance(content, list):
                content = " ".join(str(x) for x in content)
            # Clean up markdown code blocks if present
            content_str = str(content).strip()
            if content_str.startswith("```json"):
                content_str = content_str[7:]  # Remove ```json
            if content_str.startswith("```"):
                content_str = content_str[3:]  # Remove ```
            if content_str.endswith("```"):
                content_str = content_str[:-3]  # Remove trailing ```
            content_str = content_str.strip()
            
            logger.info(f"Raw LLM response: {content}")
            logger.info(f"Cleaned content: {content_str}")
            extracted_data = json.loads(content_str)
            logger.info(f"Extracted data: {extracted_data}")
        except json.JSONDecodeError as e:
            logger.error(f"JSON decode error: {e}")
            logger.error(f"Raw content that failed to parse: {content}")
            state.processing_steps.append("data_extraction_json_error")
            state.error = str(e)
            # Try to extract anyway with a fallback
            extracted_data = {"extracted": False}
        except Exception as e:
            logger.error(f"Data extraction failed: {e}")
            state.processing_steps.append("data_extraction_failed")
            state.error = str(e)
            return state

        # CRITICAL: Only track fields that were NOT already collected
        # This matches n8n behavior - only add to newly_collected_fields if the field was missing
        newly_collected_fields = []
        if extracted_data.get("extracted") is not False:
            for field, value in extracted_data.items():
                # Skip metadata fields and workflow_id
                if field in ["extracted", "workflow_id"]:
                    continue
                if value is not None:
                    # Only count as newly collected if it wasn't in completed_fields
                    if field not in state.completed_fields:
                        newly_collected_fields.append(field)
                    state.collected_data[field] = value
            state.processing_steps.append(f"data_extracted: {list(extracted_data.keys())}")
        else:
            state.processing_steps.append("no_relevant_data_found")
        
        # Defensive filter: Remove any accidental 'next_field' string from newly_collected_fields
        newly_collected_fields = [f for f in newly_collected_fields if f != "next_field"]
        # Store newly collected fields in state
        state.newly_collected_fields = newly_collected_fields

        # Validate collected data against PRD specifications
        validation_status = "pending"
        validation_error = None
        
        try:
            # Validate data using our strict validation models
            validated_data = validate_collected_data(state.collected_data, workflow_id)
            state.collected_data = validated_data
            state.processing_steps.append("data_validated_against_prd")
            validation_status = "success"
            logger.info("Data validation successful")
        except ValidationError as ve:
            logger.error(f"PRD validation error: {ve}")
            validation_error = str(ve)
            validation_status = "failed"
            state.processing_steps.append("prd_validation_failed")
        except ValueError as ve:
            logger.error(f"Validation error: {ve}")
            validation_error = str(ve) 
            validation_status = "failed"
            state.processing_steps.append("validation_failed")
        
        # Store validation status in state
        state.validation_status = validation_status
        if validation_error:
            state.validation_error = validation_error

        # Determine next field needed
        state.current_field = self._determine_next_field(state)
        state.conversation_complete = (state.current_field is None)
        
        # Update completed fields list
        state.completed_fields = list(state.collected_data.keys())
        
        # Only send to Xano if validation passed and data is complete
        if validation_status == "success" and state.conversation_complete:
            logger.info("Data validated and complete. Ready to send to Xano.")
            state.processing_steps.append("ready_for_xano_submission")
            
            # Send to Xano if environment variable is set
            if os.getenv("ENABLE_XANO_SUBMISSION", "false").lower() == "true":
                try:
                    from ..utils.xano_integration import send_collected_data_to_xano
                    xano_response = await send_collected_data_to_xano(
                        state.collected_data,
                        state.workflow_id  # type: ignore
                    )
                    state.processing_steps.append(f"xano_submission_success: {xano_response.get('id', 'unknown')}")
                    logger.info(f"Successfully submitted to Xano: {xano_response}")
                except Exception as e:
                    logger.error(f"Failed to submit to Xano: {e}")
                    state.processing_steps.append(f"xano_submission_failed: {str(e)}")
                    # Don't fail the workflow, just log the error
        else:
            logger.info(f"Not ready for Xano submission. Status: {validation_status}, Complete: {state.conversation_complete}")

        return state

    def _shopper_showroom_prompt(self) -> str:
        return (
            """Extract shopper showroom information from the salesperson's message.\n\nCONTEXT: The salesperson is creating a showroom FOR a specific customer/shopper.\n\nExtract and return JSON with these exact fields from PRD when mentioned:\n{\n  \"dealershipwebsite_url\": \"salesperson's dealership website URL\",\n  \"vehicledetailspage_urls\": [\"specific vehicle page URLs for the customer\"],\n  \"shopper_name\": \"customer/shopper's name\",\n  \"user_name\": \"salesperson's name\",\n  \"user_phone\": \"salesperson's phone number\",\n  \"user_email\": \"salesperson's email (optional)\",\n  \"vehiclesearchpreference\": [{\n    \"make\": \"vehicle make\",\n    \"model\": \"vehicle model\",\n    \"year_min\": minimum_year,\n    \"year_max\": maximum_year,\n    \"price_min\": minimum_price,\n    \"price_max\": maximum_price,\n    \"exterior_color\": [\"color preferences\"],\n    \"interior_color\": [\"interior color preferences\"],\n    \"miles_min\": minimum_mileage,\n    \"miles_max\": maximum_mileage,\n    \"condition\": [\"New\", \"Used\", \"Certified\"],\n    \"body_style\": \"SUV/sedan/truck/etc\"\n  }],\n  \"gender_descriptor\": \"inferred from pronouns (he/she/they)\",\n  \"age_descriptor\": \"inferred age range like '30s', '40s'\",\n  \"shopper_notes\": \"free text about customer lifestyle, location, notes\"\n}\n\nIMPORTANT: \n- gender_descriptor and age_descriptor are INFERRED from conversation, not asked directly\n- shopper_notes captures free-form customer information\n- Only include fields that are explicitly mentioned or can be inferred\nReturn {\"extracted\": false} if no relevant data found."""
        )
    
    def _shopper_showroom_prompt_v2(self, state: ConversationState) -> str:
        """Enhanced prompt matching n8n's comprehensive approach"""
        return f"""## Current Context
- Workflow ID: {state.workflow_id}
- Already collected fields: {state.completed_fields}
- Next priority field: {state.current_field}
- Current workflow_status: {state.workflow_status}

## CRITICAL INSTRUCTION: EXTRACT ALL AVAILABLE DATA
**You MUST extract ALL data you can identify from the user's message, starting with `next_field`, and proceeding to other required fields, then optional fields. Parse the entire message thoroughly and capture every piece of relevant information.**

**DO NOT EXTRACT OR INCLUDE WORKFLOW_ID IN YOUR RESPONSE - IT IS ALREADY SET IN THE CONTEXT**

**Example:**
- If `shopper_name` already exists (field is in collected_fields), and user mentions "John", do NOT extract it again
- Only extract if the field was previously missing or user says "change my name to..."

## Field Definitions

### Workflow 2 (Create Shopper Drift Showroom)
**Required Fields:**
- `dealershipwebsite_url` (string): Dealership website URL
- `vehicledetailspage_urls` (array of strings): Vehicle detail page URLs from the dealership website the shopper is interested in.
- `user_name` (string): Your name
- `shopper_name` (string): Name of person showroom is for
- `user_phone` (string): Contact phone number
- `vehiclesearchpreference` (array of objects): Vehicle criteria with:
  - `make`, `model`, `trim` (array), `year_min/max`, `price_min/max`
  - `exterior_color` (array), `interior_color` (array), `miles_min/max`
  - `condition` (array: "New", "Used", "Certified"), `body_style`

**Optional Fields:**
- `gender_descriptor`: "man" or "woman" - inferred from pronouns used to describe the shopper (lowercase only)
- `age_descriptor`: "20s", "30s", "40s", "50s", "60s", "70s", "80s"  
- `shopper_notes` (string): Lifestyle, interests, family details
- `location_descriptor` (string): Geographic location
- `user_email` (string): Contact email

## Data Extraction Examples

**Input:** "I want to create a shopper drift for allie davis. she's mid-20's in age, likes her 2 kids and dog, and wants either a blue mercedes c-class sedan or BMW x3. price range is under 40k and miles needs to be below 10k. years 2022 and 2023 are what she wants. The vehicle pages are https://dealer.com/bmw-x3-2023 and https://dealer.com/mercedes-c-class-2022"

**Should Extract:**
```json
{{
  "shopper_name": "allie davis",
  "gender_descriptor": "woman",
  "age_descriptor": "20s", 
  "shopper_notes": "allie davis has 2 kids and dog",
  "vehicledetailspage_urls": ["https://dealer.com/bmw-x3-2023", "https://dealer.com/mercedes-c-class-2022"],
  "vehiclesearchpreference": [
    {{
      "make": "Mercedes",
      "model": "C-Class",
      "body_style": "sedan", 
      "exterior_color": ["blue"],
      "price_max": 40000,
      "miles_max": 10000,
      "year_min": 2022,
      "year_max": 2023
    }},
    {{
      "make": "BMW", 
      "model": "X3",
      "price_max": 40000,
      "miles_max": 10000,
      "year_min": 2022,
      "year_max": 2023
    }}
  ]
}}
```

## Processing Instructions

1. **OPTIONAL DATA COLLECTION**: If workflow_status is "optional_collection", user can proceed with creation at any time

2. **COMPREHENSIVE DATA EXTRACTION**: 
   - Scan the entire user message for ANY field data
   - Extract everything you can identify, not just the `next_field`
   - Include partial/incomplete data - don't wait for complete information

3. **Age Translation**:
   - "mid-20's" or "20's" → "20s"
   - "early 30s" or "30's" → "30s"
   - etc.

4. **Vehicle Preferences**:
   - Create separate objects for each vehicle mentioned
   - Convert "under 40k" → `price_max: 40000`
   - Convert "below 10k miles" → `miles_max: 10000`

5. **Gender Translation**:
   - "him" or "he" or "his" → "man"
   - "her" or "she" or "hers" → "woman"
   - Infer from conversation context

6. **Shopper Notes**:
   - Combine personal details: "allie davis has 2 kids and dog"
   - Include lifestyle mentions, interests, family info

Return ONLY the extracted data as JSON. Include "extracted": false if no relevant data found."""

    def _personal_showroom_prompt(self) -> str:
        return (
            """Extract salesperson's personal vehicle showcase information from their message.\n\nCONTEXT: The salesperson is creating their own personal vehicle showcase (like a digital business card with their favorite vehicles).\n\nExtract and return JSON with these fields when mentioned:\n{\n  \"dealershipwebsite_url\": \"salesperson's dealership website URL\",\n  \"vehicledetailspage_urls\": [\"URLs of specific vehicles they want to showcase\"],\n  \"user_name\": \"salesperson's name\",\n  \"user_phone\": \"salesperson's phone number\",\n  \"user_email\": \"salesperson's email\",\n  \"vehiclesearchpreference\": [{\n    \"make\": \"vehicle make\",\n    \"model\": \"vehicle model\",\n    \"year_min\": minimum_year,\n    \"year_max\": maximum_year,\n    \"price_min\": minimum_price,\n    \"price_max\": maximum_price,\n    \"body_style\": \"SUV/sedan/truck/etc\",\n    \"condition\": [\"New\", \"Used\", \"Certified\"]\n  }]\n}\n\nOnly include fields that are explicitly mentioned. Return {\"extracted\": false} if no relevant data found."""
        )
    
    def _personal_showroom_prompt_v2(self, state: ConversationState) -> str:
        """Enhanced prompt for personal showroom matching n8n approach"""
        return f"""## Current Context
- Workflow ID: {state.workflow_id}
- Already collected fields: {state.completed_fields}
- Next priority field: {state.current_field}
- Current workflow_status: {state.workflow_status}

## CRITICAL INSTRUCTION: EXTRACT ALL AVAILABLE DATA
**Extract ALL data from the user's message. Parse thoroughly and capture every piece of relevant information.**

## Field Definitions

### Workflow 3 (Create Personal Drift Showroom)
**Required Fields:**
- `dealershipwebsite_url`: Dealership website URL
- `vehicledetailspage_urls`: URLs of specific vehicles to showcase
- `user_name`: Your name
- `user_phone`: Your phone number
- `user_email`: Your email address

**Optional Fields:**
- `vehiclesearchpreference` (array of objects): Vehicle criteria with same structure as workflow 2

## Processing Instructions

1. Extract everything you can identify from the message
2. Only include fields that are explicitly mentioned
3. Skip fields already in collected_fields unless user is updating them

Return ONLY the extracted data as JSON. Include "extracted": false if no relevant data found."""
    
    def _determine_next_field(self, state: ConversationState) -> Optional[str]:
        """
        Determine the next field to collect based on workflow and PRD requirements.
        Returns the actual field name (not description) to match n8n workflow behavior.
        Returns None if all required fields are collected.
        """
        workflow_id = state.workflow_id
        collected = state.collected_data
        
        if workflow_id == 2:  # Shopper Showroom
            # Required fields - return field names, not descriptions
            required_fields = [
                "dealershipwebsite_url",
                "shopper_name",
                "user_name",
                "user_phone"
            ]
            
            for field in required_fields:
                if field not in collected or not collected.get(field):
                    return field
                    
            # Check conditional requirement: either vehiclesearchpreference OR vehicledetailspage_urls
            has_preferences = collected.get("vehiclesearchpreference") and len(collected.get("vehiclesearchpreference", [])) > 0
            has_urls = collected.get("vehicledetailspage_urls") and len(collected.get("vehicledetailspage_urls", [])) > 0
            
            if not has_preferences and not has_urls:
                # Return the field name that makes sense based on context
                # Frontend will handle this appropriately
                return "vehicledetailspage_urls"
                    
        elif workflow_id == 3:  # Personal Showroom
            # Required fields - return field names, not descriptions
            required_fields = [
                "dealershipwebsite_url",
                "vehicledetailspage_urls", 
                "user_name",
                "user_phone",
                "user_email"
            ]
            
            for field in required_fields:
                if field not in collected or not collected.get(field):
                    return field
                    
        return None  # All required fields collected

# Node function for LangGraph integration
async def data_collection_node(state: ConversationState) -> ConversationState:
    """LangGraph node wrapper for DataCollectionNode."""
    node = DataCollectionNode()
    return await node.collect_data(state)

__all__ = ["data_collection_node", "FIELD_DESCRIPTIONS"] 