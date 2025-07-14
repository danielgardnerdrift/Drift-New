import { NextRequest, NextResponse } from "next/server";
import { xanoClient } from "@/lib/xano-client";

export async function POST(req: NextRequest) {
  try {
    const { sessionId } = await req.json();
    
    // Try to get IP address
    let ipAddress: string | null = null;
    try {
      // Try to get IP from headers first
      const forwardedFor = req.headers.get('x-forwarded-for');
      const realIp = req.headers.get('x-real-ip');
      
      if (forwardedFor) {
        // x-forwarded-for can contain multiple IPs, take the first one
        ipAddress = forwardedFor.split(',')[0].trim();
      } else if (realIp) {
        ipAddress = realIp;
      }
      
      // Skip localhost IPs and try external service
      if (!ipAddress || ipAddress === '::1' || ipAddress === '127.0.0.1') {
        try {
          const ipResponse = await fetch('https://api.ipify.org?format=json');
          if (ipResponse.ok) {
            const ipData = await ipResponse.json();
            ipAddress = ipData.ip;
          }
        } catch (err) {
          console.log('Failed to fetch external IP:', err);
          // Fall back to a default for local development
          ipAddress = '127.0.0.1';
        }
      }
    } catch (error) {
      console.log('Could not fetch IP address:', error);
      // Continue without IP address
    }
    
    // Call Xano's session endpoint
    const response = await xanoClient.getOrCreateSession({
      session_id: sessionId || null,
      ip_address: ipAddress
    });
    
    console.log('Session API response:', response);
    
    if (response.error) {
      throw new Error(response.error);
    }
    
    // The response contains the session data directly
    const sessionData = response;
    
    console.log('Session data:', sessionData);
    
    return NextResponse.json({
      success: true,
      session: sessionData
    });
    
  } catch (error) {
    console.error('Session API error:', error);
    
    return NextResponse.json(
      { 
        success: false,
        error: 'Failed to create/get session',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}