import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { ethers } from 'ethers';

const CLIENT_SECRET_KEY = process.env.NEXT_PUBLIC_CLIENT_SECRET_KEY;

export async function middleware(request: NextRequest) {
  // Only apply to POST requests
  if (request.method !== 'POST') {
    return NextResponse.next();
  }

  try {
    // Get the request body
    const body = await request.json();
    const { randomKey, fusedKey } = body;

    // Skip middleware for routes that don't need verification
    const publicRoutes = ['/api/spin', '/api/check-envelope'];
    if (publicRoutes.includes(request.nextUrl.pathname)) {
      return NextResponse.next();
    }

    // Verify the fused key
    if (!randomKey || !fusedKey) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing key verification' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const expectedFusedKey = ethers.keccak256(ethers.toUtf8Bytes(randomKey + CLIENT_SECRET_KEY));
    if (fusedKey !== expectedFusedKey) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid key verification' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // If verification passes, continue
    return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// Configure middleware to run on all routes
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}; 