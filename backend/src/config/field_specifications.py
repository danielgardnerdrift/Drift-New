"""
Field specifications for data validation based on PRD requirements.

This module defines the exact field requirements for each workflow type
to ensure data consistency when sending to Xano API.
"""

FIELD_SPECIFICATIONS = {
    "shopper_showroom": {
        "required_fields": [
            "dealershipwebsite_url",
            "shopper_name", 
            "user_name",
            "user_phone"
        ],
        "conditional_required": [
            # Either vehiclesearchpreference OR vehicledetailspage_urls must be present
            ["vehiclesearchpreference", "vehicledetailspage_urls"]
        ],
        "optional_fields": [
            "user_email",
            "gender_descriptor",
            "age_descriptor", 
            "shopper_notes"
        ],
        "field_types": {
            "dealershipwebsite_url": "string",
            "vehicledetailspage_urls": "array",
            "shopper_name": "string",
            "user_name": "string",
            "user_phone": "string",
            "user_email": "string",
            "vehiclesearchpreference": "array",
            "gender_descriptor": "string",
            "age_descriptor": "string",
            "shopper_notes": "string"
        },
        "field_descriptions": {
            "dealershipwebsite_url": "Salesperson's dealership website URL",
            "vehicledetailspage_urls": "Specific vehicle page URLs for the customer",
            "shopper_name": "Customer/shopper's name",
            "user_name": "Salesperson's name",
            "user_phone": "Salesperson's phone number",
            "user_email": "Salesperson's email (optional)",
            "vehiclesearchpreference": "Vehicle search preferences",
            "gender_descriptor": "Inferred from pronouns (he/she/they)",
            "age_descriptor": "Inferred age range like '30s', '40s'",
            "shopper_notes": "Free text about customer lifestyle, location, notes"
        }
    },
    "personal_showroom": {
        "required_fields": [
            "dealershipwebsite_url",
            "vehicledetailspage_urls",
            "user_name",
            "user_phone",
            "user_email"
        ],
        "optional_fields": [
            "vehiclesearchpreference"
        ],
        "field_types": {
            "dealershipwebsite_url": "string",
            "vehicledetailspage_urls": "array", 
            "user_name": "string",
            "user_phone": "string",
            "user_email": "string",
            "vehiclesearchpreference": "array"
        },
        "field_descriptions": {
            "dealershipwebsite_url": "Salesperson's dealership website URL",
            "vehicledetailspage_urls": "URLs of specific vehicles to showcase",
            "user_name": "Salesperson's name",
            "user_phone": "Salesperson's phone number", 
            "user_email": "Salesperson's email",
            "vehiclesearchpreference": "Vehicle preferences for showcase"
        }
    }
}

# Vehicle search preference schema
VEHICLE_SEARCH_PREFERENCE_SCHEMA = {
    "make": {"type": "string", "required": False},
    "model": {"type": "string", "required": False},
    "year_min": {"type": "integer", "required": False},
    "year_max": {"type": "integer", "required": False},
    "price_min": {"type": "number", "required": False},
    "price_max": {"type": "number", "required": False},
    "exterior_color": {"type": "array", "required": False},
    "interior_color": {"type": "array", "required": False},
    "miles_min": {"type": "integer", "required": False},
    "miles_max": {"type": "integer", "required": False},
    "condition": {"type": "array", "required": False, "allowed_values": ["New", "Used", "Certified"]},
    "body_style": {"type": "string", "required": False}
}