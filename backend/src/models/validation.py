"""
Pydantic models for strict data validation before sending to Xano API.

These models ensure all collected data matches PRD specifications exactly.
"""
import re
from typing import Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field, field_validator, model_validator
from datetime import datetime


class VehicleSearchPreference(BaseModel):
    """Vehicle search preference structure."""
    make: Optional[str] = None
    model: Optional[str] = None
    year_min: Optional[int] = None
    year_max: Optional[int] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    exterior_color: Optional[List[str]] = []
    interior_color: Optional[List[str]] = []
    miles_min: Optional[int] = None
    miles_max: Optional[int] = None
    condition: Optional[List[str]] = []
    body_style: Optional[str] = None
    
    @field_validator('condition')
    def validate_condition(cls, v):
        if v:
            allowed_conditions = ["New", "Used", "Certified"]
            for condition in v:
                if condition not in allowed_conditions:
                    raise ValueError(f"Invalid condition: {condition}. Must be one of {allowed_conditions}")
        return v
    
    @field_validator('year_min', 'year_max')
    def validate_year(cls, v):
        if v is not None:
            current_year = datetime.now().year
            if v < 1900 or v > current_year + 2:
                raise ValueError(f"Invalid year: {v}. Must be between 1900 and {current_year + 2}")
        return v
    
    @field_validator('price_min', 'price_max', 'miles_min', 'miles_max')
    def validate_positive_numbers(cls, v):
        if v is not None and v < 0:
            raise ValueError(f"Value must be positive: {v}")
        return v


class ShopperShowroomData(BaseModel):
    """Validation model for Shopper Showroom (Workflow 2) data."""
    # Required fields
    dealershipwebsite_url: str = Field(..., description="Salesperson's dealership website URL")
    shopper_name: str = Field(..., description="Customer/shopper's name")
    user_name: str = Field(..., description="Salesperson's name")
    user_phone: str = Field(..., description="Salesperson's phone number")
    
    # Conditional required (at least one must be present)
    vehiclesearchpreference: Optional[List[VehicleSearchPreference]] = None
    vehicledetailspage_urls: Optional[List[str]] = None
    
    # Optional fields
    user_email: Optional[str] = None
    gender_descriptor: Optional[str] = None
    age_descriptor: Optional[str] = None
    shopper_notes: Optional[str] = None
    
    @field_validator('dealershipwebsite_url')
    def validate_dealership_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError("Dealership URL must start with http:// or https://")
        return v
    
    @field_validator('vehicledetailspage_urls')
    def validate_vehicle_urls(cls, v):
        if v:
            for url in v:
                if not url.startswith(('http://', 'https://')):
                    raise ValueError(f"Vehicle URL must start with http:// or https://: {url}")
        return v
    
    @field_validator('user_email')
    def validate_email(cls, v):
        if v is not None and v:
            email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
            if not re.match(email_regex, v):
                raise ValueError(f"Invalid email format: {v}")
        return v
    
    @field_validator('user_phone')
    def validate_phone(cls, v):
        if v:
            # Remove common phone formatting characters
            cleaned = re.sub(r'[\s\-\.\(\)]', '', v)
            # Check if it's a valid phone number (basic check)
            # Allow test numbers (7+ digits) or real numbers (10-15 digits)
            if not re.match(r'^\+?\d{7,15}$', cleaned):
                raise ValueError(f"Invalid phone number format: {v}")
        return v
    
    @field_validator('gender_descriptor')
    def validate_gender_descriptor(cls, v):
        if v:
            # Match n8n workflow expectations: "man" or "woman"
            allowed_values = ["man", "woman"]
            if v.lower() not in allowed_values:
                raise ValueError(f"Invalid gender descriptor: {v}. Must be 'man' or 'woman'")
        return v.lower()  # Ensure lowercase
    
    @field_validator('age_descriptor')  
    def validate_age_descriptor(cls, v):
        if v:
            # Allow formats like "30s", "40s", "20-30", etc.
            if not re.match(r'^\d{2}s?$|^\d{2}-\d{2}$', v):
                raise ValueError(f"Invalid age descriptor format: {v}. Use formats like '30s' or '20-30'")
        return v
    
    @model_validator(mode='after')
    def validate_conditional_required(self):
        """Ensure at least one of vehiclesearchpreference or vehicledetailspage_urls is present."""
        vehiclesearch = self.vehiclesearchpreference
        vehicleurls = self.vehicledetailspage_urls
        
        if not vehiclesearch and not vehicleurls:
            raise ValueError("Either vehiclesearchpreference or vehicledetailspage_urls must be provided")
        
        return self


class PersonalShowroomData(BaseModel):
    """Validation model for Personal Showroom (Workflow 3) data."""
    # Required fields
    dealershipwebsite_url: str = Field(..., description="Salesperson's dealership website URL")
    vehicledetailspage_urls: List[str] = Field(..., description="URLs of specific vehicles to showcase")
    user_name: str = Field(..., description="Salesperson's name")
    user_phone: str = Field(..., description="Salesperson's phone number")
    user_email: str = Field(..., description="Salesperson's email")
    
    # Optional fields
    vehiclesearchpreference: Optional[List[VehicleSearchPreference]] = None
    
    @field_validator('dealershipwebsite_url')
    def validate_dealership_url(cls, v):
        if not v.startswith(('http://', 'https://')):
            raise ValueError("Dealership URL must start with http:// or https://")
        return v
    
    @field_validator('vehicledetailspage_urls')
    def validate_vehicle_urls(cls, v):
        if not v:
            raise ValueError("At least one vehicle URL must be provided")
        for url in v:
            if not url.startswith(('http://', 'https://')):
                raise ValueError(f"Vehicle URL must start with http:// or https://: {url}")
        return v
    
    @field_validator('user_email')
    def validate_email(cls, v):
        email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        if not re.match(email_regex, v):
            raise ValueError(f"Invalid email format: {v}")
        return v
    
    @field_validator('user_phone')
    def validate_phone(cls, v):
        # Remove common phone formatting characters
        cleaned = re.sub(r'[\s\-\.\(\)]', '', v)
        # Check if it's a valid phone number (basic check)
        # Allow test numbers (7+ digits) or real numbers (10-15 digits)
        if not re.match(r'^\+?\d{7,15}$', cleaned):
            raise ValueError(f"Invalid phone number format: {v}")
        return v


def validate_collected_data(data: Dict[str, Any], workflow_id: int) -> Dict[str, Any]:
    """
    Validate collected data against PRD specifications before sending to Xano.
    
    Args:
        data: The collected data to validate
        workflow_id: The workflow ID (2 for shopper showroom, 3 for personal showroom)
        
    Returns:
        Validated data dictionary
        
    Raises:
        ValidationError: If data doesn't match PRD specifications
        ValueError: If unknown workflow ID
    """
    if workflow_id == 2:
        # Validate shopper showroom data
        validated_model = ShopperShowroomData(**data)
        return validated_model.model_dump(exclude_none=True)
    elif workflow_id == 3:
        # Validate personal showroom data
        validated_model = PersonalShowroomData(**data)
        return validated_model.model_dump(exclude_none=True)
    else:
        raise ValueError(f"Unknown workflow ID: {workflow_id}. Expected 2 or 3.")


__all__ = [
    "VehicleSearchPreference",
    "ShopperShowroomData", 
    "PersonalShowroomData",
    "validate_collected_data"
]