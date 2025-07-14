import { NextRequest, NextResponse } from "next/server";

// Track collected data across requests for proper state management
let mockCollectedData: Record<string, any> = {};
let currentField: string | null = null;
let workflowId: number = 1;
let workflowStatus: string = "pending";

// Mock responses for testing when backend is not available
const mockResponses: Record<string, any> = {
  "create shopper showroom": {
    content: "Great! I'll help you create a shopper showroom. Let's start by getting your dealership information. Please provide your dealership website URL.",
    workflow_id: 2,
    workflow_status: "collecting_data",
    next_field: "your dealership website URL",
    collected_data: {},
    conversation_id: 1001
  },
  "https://": {
    content: "Thank you! Now, please provide your name.",
    workflow_id: 2,
    workflow_status: "collecting_data", 
    next_field: "your name",
    collected_data: {
      dealershipwebsite_url: "https://example-dealer.com"
    },
    conversation_id: 1001
  },
  "default_name": {
    content: "Got it! Could you please provide your phone number?",
    workflow_id: 2,
    workflow_status: "collecting_data",
    next_field: "your phone number",
    collected_data: {
      dealershipwebsite_url: "https://example-dealer.com",
      user_name: "John Smith"
    },
    conversation_id: 1001
  },
  "default_phone": {
    content: "Thanks! Now I need your email address.",
    workflow_id: 2,
    workflow_status: "collecting_data",
    next_field: "your email",
    collected_data: {
      dealershipwebsite_url: "https://example-dealer.com",
      user_name: "John Smith",
      user_phone: "555-123-4567"
    },
    conversation_id: 1001
  },
  "default_email": {
    content: "Perfect! Now, what's your customer's name?",
    workflow_id: 2,
    workflow_status: "collecting_data",
    next_field: "your customer's name",
    collected_data: {
      dealershipwebsite_url: "https://example-dealer.com",
      user_name: "John Smith",
      user_phone: "555-123-4567",
      user_email: "john@dealer.com"
    },
    conversation_id: 1001
  },
  "default_customer": {
    content: "Great! Now, would you like to specify vehicle preferences or provide specific vehicle page URLs?",
    workflow_id: 2,
    workflow_status: "collecting_data",
    next_field: "vehicle preferences or specific vehicle page URLs",
    collected_data: {
      dealershipwebsite_url: "https://example-dealer.com",
      user_name: "John Smith",
      user_phone: "555-123-4567",
      user_email: "john@dealer.com",
      shopper_name: "Jane Doe"
    },
    conversation_id: 1001
  }
};

// Define the field progression for shopper showroom
const shopperShowroomFields = [
  { field: "your phone number", key: "user_phone", message: "Got it! Could you please provide your phone number?" },
  { field: "your email", key: "user_email", message: "Thanks! Now I need your email address." },
  { field: "your customer's name", key: "shopper_name", message: "Perfect! Now, what's your customer's name?" },
  { field: "your customer's phone number", key: "shopper_phone", message: "Got it! What's your customer's phone number?" },
  { field: "your customer's email", key: "shopper_email", message: "Thanks! What's your customer's email address?" },
  { field: "vehicle preferences or specific vehicle page URLs", key: "vehicle_choice", message: "Great! Now, would you like to specify vehicle preferences or provide specific vehicle page URLs?" }
];

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();
    const userQuery = messages.length > 0 ? messages[messages.length - 1].content : '';
    const lowerQuery = userQuery.toLowerCase();
    
    let response;
    
    // Handle initial workflow selection
    if (workflowStatus === "pending") {
      if (lowerQuery.includes('shopper showroom')) {
        workflowId = 2;
        workflowStatus = "collecting_data";
        currentField = "your phone number";
        mockCollectedData = {};
        
        response = {
          content: "Great! I'll help you create a shopper showroom for your customer. Let's start by collecting some information. Could you please provide your phone number?",
          workflow_id: workflowId,
          workflow_status: workflowStatus,
          next_field: currentField,
          collected_data: mockCollectedData,
          conversation_id: 1001
        };
      } else if (lowerQuery.includes('personal showroom')) {
        workflowId = 3;
        workflowStatus = "collecting_data";
        currentField = "showroom name";
        mockCollectedData = {};
        
        response = {
          content: "Excellent! I'll help you create a personal showroom. What would you like to name your showroom?",
          workflow_id: workflowId,
          workflow_status: workflowStatus,
          next_field: currentField,
          collected_data: mockCollectedData,
          conversation_id: 1001
        };
      } else {
        response = {
          content: "I'm here to help you create showrooms. Would you like to create a shopper showroom or a personal showroom?",
          workflow_id: 1,
          workflow_status: "pending",
          next_field: null,
          collected_data: {},
          conversation_id: 1001
        };
      }
    } 
    // Handle data collection for shopper showroom
    else if (workflowId === 2 && workflowStatus === "collecting_data") {
      // Find current field index
      const currentFieldIndex = shopperShowroomFields.findIndex(f => f.field === currentField);
      
      if (currentFieldIndex >= 0) {
        // Store the user's input for the current field
        const fieldInfo = shopperShowroomFields[currentFieldIndex];
        mockCollectedData[fieldInfo.key] = userQuery.trim();
        
        // Move to next field
        if (currentFieldIndex < shopperShowroomFields.length - 1) {
          const nextFieldInfo = shopperShowroomFields[currentFieldIndex + 1];
          currentField = nextFieldInfo.field;
          
          response = {
            content: nextFieldInfo.message,
            workflow_id: workflowId,
            workflow_status: workflowStatus,
            next_field: currentField,
            collected_data: mockCollectedData,
            conversation_id: 1001
          };
        } else {
          // All fields collected
          workflowStatus = "completed";
          currentField = null;
          
          response = {
            content: "Perfect! I have all the information I need. I'm now creating a personalized showroom for your customer. This will take about 10-15 seconds...",
            workflow_id: workflowId,
            workflow_status: workflowStatus,
            next_field: currentField,
            collected_data: mockCollectedData,
            conversation_id: 1001
          };
        }
      }
    }
    // Default response
    else {
      response = {
        content: "I understand. How can I help you today?",
        workflow_id: workflowId,
        workflow_status: workflowStatus,
        next_field: currentField,
        collected_data: mockCollectedData,
        conversation_id: 1001
      };
    }
    
    // Log for debugging
    console.log('Mock API Response:', {
      userQuery,
      currentField,
      collectedData: mockCollectedData,
      workflowStatus
    });
    
    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('Mock chat API error:', error);
    return NextResponse.json(
      { error: 'Failed to process message' },
      { status: 500 }
    );
  }
}