"""
UI Tools for Vercel AI SDK v5 Integration

This module defines the tool schemas that LangGraph nodes will use to generate
UI components dynamically based on the data collection requirements.
"""

import json
from typing import List, Dict, Any, Optional

# Drift brand color
DRIFT_THEME_COLOR = "#fe3500"

def create_ui_tools() -> List[Dict[str, Any]]:
    """
    Create the tool definitions for OpenAI function calling.
    These tools generate JSX strings that will be rendered in the frontend.
    """
    return [
        {
            "type": "function",
            "function": {
                "name": "render_slider",
                "description": "Render a slider component for numeric ranges like year, price, or mileage",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name for the slider"
                        },
                        "min": {
                            "type": "number",
                            "description": "Minimum value"
                        },
                        "max": {
                            "type": "number",
                            "description": "Maximum value"
                        },
                        "defaultValue": {
                            "type": "array",
                            "items": {"type": "number"},
                            "description": "Default range values [min, max]"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label for the slider"
                        },
                        "step": {
                            "type": "number",
                            "description": "Step increment",
                            "default": 1
                        }
                    },
                    "required": ["name", "min", "max", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_select",
                "description": "Render a select dropdown for single choice fields like make, model, or body style",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name for the select"
                        },
                        "options": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "string"},
                                    "label": {"type": "string"}
                                }
                            },
                            "description": "Available options"
                        },
                        "defaultValue": {
                            "type": "string",
                            "description": "Default selected value"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label"
                        },
                        "placeholder": {
                            "type": "string",
                            "description": "Placeholder text"
                        }
                    },
                    "required": ["name", "options", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_multi_select",
                "description": "Render a multi-select component for array fields like colors or conditions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name"
                        },
                        "options": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "value": {"type": "string"},
                                    "label": {"type": "string"}
                                }
                            }
                        },
                        "defaultValue": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Default selected values"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label"
                        },
                        "maxSelections": {
                            "type": "number",
                            "description": "Maximum number of selections allowed"
                        }
                    },
                    "required": ["name", "options", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_input",
                "description": "Render an input field for text data like names, emails, or URLs",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name"
                        },
                        "type": {
                            "type": "string",
                            "enum": ["text", "email", "url", "tel"],
                            "description": "Input type",
                            "default": "text"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label"
                        },
                        "placeholder": {
                            "type": "string",
                            "description": "Placeholder text"
                        },
                        "defaultValue": {
                            "type": "string",
                            "description": "Default value"
                        },
                        "required": {
                            "type": "boolean",
                            "description": "Is this field required",
                            "default": False
                        }
                    },
                    "required": ["name", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_textarea",
                "description": "Render a textarea for longer text like notes or descriptions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label"
                        },
                        "placeholder": {
                            "type": "string",
                            "description": "Placeholder text"
                        },
                        "rows": {
                            "type": "number",
                            "description": "Number of visible rows",
                            "default": 4
                        },
                        "defaultValue": {
                            "type": "string",
                            "description": "Default text"
                        }
                    },
                    "required": ["name", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_vehicle_preferences_form",
                "description": "Render a complete vehicle preferences form with multiple sections",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vehicleCount": {
                            "type": "number",
                            "description": "Number of vehicle preference sections to show",
                            "default": 1
                        },
                        "currentData": {
                            "type": "object",
                            "description": "Current collected data to pre-fill"
                        },
                        "showAddButton": {
                            "type": "boolean",
                            "description": "Show button to add more vehicles",
                            "default": True
                        }
                    },
                    "required": []
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_array_input",
                "description": "Render an array input for multiple values like URLs",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": "string",
                            "description": "Field name"
                        },
                        "label": {
                            "type": "string",
                            "description": "Display label"
                        },
                        "itemType": {
                            "type": "string",
                            "enum": ["text", "url", "email"],
                            "description": "Type of each item",
                            "default": "text"
                        },
                        "placeholder": {
                            "type": "string",
                            "description": "Placeholder for each item"
                        },
                        "defaultValue": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Default values"
                        }
                    },
                    "required": ["name", "label"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_vehicle_cards_slider",
                "description": "Render a horizontal slider of vehicle cards for inventory results",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "vehicles": {
                            "type": "array",
                            "items": {
                                "type": "object",
                                "properties": {
                                    "make": {"type": "string"},
                                    "model": {"type": "string"},
                                    "year": {"type": "number"},
                                    "price": {"type": "number"},
                                    "image": {"type": "string"},
                                    "mileage": {"type": "number"},
                                    "condition": {"type": "string"},
                                    "color": {"type": "string"},
                                    "vin": {"type": "string"},
                                    "details": {"type": "string"}
                                }
                            },
                            "description": "Array of vehicle data"
                        },
                        "title": {
                            "type": "string",
                            "description": "Title for the slider section"
                        }
                    },
                    "required": ["vehicles"]
                }
            }
        },
        {
            "type": "function",
            "function": {
                "name": "render_form",
                "description": "Render a form wrapper that contains other components",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "title": {
                            "type": "string",
                            "description": "Form title"
                        },
                        "description": {
                            "type": "string",
                            "description": "Form description"
                        },
                        "submitLabel": {
                            "type": "string",
                            "description": "Submit button text",
                            "default": "Submit"
                        },
                        "fields": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "Field names to include in the form"
                        }
                    },
                    "required": ["title"]
                }
            }
        }
    ]


def generate_jsx_for_tool(tool_name: str, args: Dict[str, Any]) -> str:
    """
    Generate JSX string for a specific tool call.
    This is what gets returned when a tool is "executed" by the LLM.
    """
    
    if tool_name == "render_slider":
        return f"""<Slider
  name="{args.get('name')}"
  label="{args.get('label')}"
  min={{{args.get('min')}}}
  max={{{args.get('max')}}}
  defaultValue={{{json.dumps(args.get('defaultValue', [args.get('min'), args.get('max')])}}}
  step={{{args.get('step', 1)}}}
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
/>"""

    elif tool_name == "render_select":
        options_jsx = "\n".join([
            f'    <option value="{opt["value"]}">{opt["label"]}</option>'
            for opt in args.get('options', [])
        ])
        return f"""<Select
  name="{args.get('name')}"
  label="{args.get('label')}"
  defaultValue="{args.get('defaultValue', '')}"
  placeholder="{args.get('placeholder', 'Select an option')}"
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
>
{options_jsx}
</Select>"""

    elif tool_name == "render_multi_select":
        return f"""<MultiSelect
  name="{args.get('name')}"
  label="{args.get('label')}"
  options={{{json.dumps(args.get('options', []))}}}
  defaultValue={{{json.dumps(args.get('defaultValue', []))}}}
  maxSelections={{{args.get('maxSelections', 'undefined')}}}
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
/>"""

    elif tool_name == "render_input":
        return f"""<Input
  name="{args.get('name')}"
  type="{args.get('type', 'text')}"
  label="{args.get('label')}"
  placeholder="{args.get('placeholder', '')}"
  defaultValue="{args.get('defaultValue', '')}"
  required={{{str(args.get('required', False)).lower()}}}
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
/>"""

    elif tool_name == "render_textarea":
        return f"""<Textarea
  name="{args.get('name')}"
  label="{args.get('label')}"
  placeholder="{args.get('placeholder', '')}"
  rows={{{args.get('rows', 4)}}}
  defaultValue="{args.get('defaultValue', '')}"
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
/>"""

    elif tool_name == "render_vehicle_preferences_form":
        return f"""<VehiclePreferencesForm
  vehicleCount={{{args.get('vehicleCount', 1)}}}
  currentData={{{json.dumps(args.get('currentData', {}))}}}
  showAddButton={{{str(args.get('showAddButton', True)).lower()}}}
  themeColor="{DRIFT_THEME_COLOR}"
/>"""

    elif tool_name == "render_array_input":
        return f"""<ArrayInput
  name="{args.get('name')}"
  label="{args.get('label')}"
  itemType="{args.get('itemType', 'text')}"
  placeholder="{args.get('placeholder', '')}"
  defaultValue={{{json.dumps(args.get('defaultValue', []))}}}
  className="w-full"
  style={{{{ "--primary": "{DRIFT_THEME_COLOR}" }}}}
/>"""

    elif tool_name == "render_vehicle_cards_slider":
        vehicles_jsx = json.dumps(args.get('vehicles', []), indent=2)
        return f"""<VehicleCardsSlider
  vehicles={{{vehicles_jsx}}}
  title="{args.get('title', 'Vehicle Results')}"
  themeColor="{DRIFT_THEME_COLOR}"
/>"""

    elif tool_name == "render_form":
        return f"""<Form
  title="{args.get('title')}"
  description="{args.get('description', '')}"
  submitLabel="{args.get('submitLabel', 'Submit')}"
  fields={{{json.dumps(args.get('fields', []))}}}
  themeColor="{DRIFT_THEME_COLOR}"
  onSubmit={{(data) => handleFormSubmit(data)}}
/>"""

    return f"<!-- Unknown tool: {tool_name} -->"


def get_ui_generation_prompt(current_field: Optional[str], collected_data: Dict[str, Any], workflow_id: int) -> str:
    """
    Generate the system prompt for UI generation based on current state.
    """
    base_prompt = f"""You are a UI generator for a vehicle showroom creation app. 
Generate appropriate UI components based on the data collection needs.

Brand color: {DRIFT_THEME_COLOR}

ENFORCED RULES:
- ALWAYS use render_slider for numeric ranges (year, price, mileage)
- ALWAYS use render_select for single choice fields (make, model, body_style) 
- ALWAYS use render_multi_select for array fields (colors, conditions)
- ALWAYS use render_input for text fields (names, emails, URLs)
- ALWAYS use render_textarea for notes/descriptions
- ALWAYS use render_vehicle_cards_slider for vehicle inventory results
- For vehicle preferences, use render_vehicle_preferences_form to allow multiple vehicles

Current workflow: {workflow_id} ({'Shopper Showroom' if workflow_id == 2 else 'Personal Showroom' if workflow_id == 3 else 'General'})
Current field to collect: {current_field}
Already collected data: {json.dumps(collected_data, indent=2)}

Based on the current field and context, generate the appropriate UI component(s).
If multiple fields need collection, use render_form to wrap them.
Always maintain the brand theme color in all components."""

    return base_prompt