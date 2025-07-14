import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const xanoRes = await fetch('https://api.autosnap.cloud/api:JGlUJzp_/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await xanoRes.json();
  const response = NextResponse.json({ ...data, authToken: undefined }, { status: xanoRes.status });
  if (data.authToken) {
    response.cookies.set('authToken', data.authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24, // 1 day
    });
  }
  return response;
} 