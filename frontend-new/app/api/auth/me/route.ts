import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  const authToken = req.cookies.get('authToken')?.value;
  if (!authToken) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const xanoRes = await fetch('https://api.autosnap.cloud/api:JGlUJzp_/auth/me', {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });
  const data = await xanoRes.json();
  return NextResponse.json(data, { status: xanoRes.status });
} 