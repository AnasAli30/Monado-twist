import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Configure allowed origins
const allowedOrigins = [
  'https://monado-twist.vercel.app', // Main app URL
//   'http://localhost:3000', // Local development
//   // Add any other origins you want to allow
];

export function middleware(request: NextRequest) {
  const origin = request.headers.get('origin') || '';
  
  // Check if the origin is allowed
  if (!allowedOrigins.includes(origin) && origin !== '') {
    return new NextResponse(null, {
      status: 403, // Forbidden
      statusText: 'Forbidden',
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  }

  // For OPTIONS requests (preflight)
  if (request.method === 'OPTIONS') {
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400', // 24 hours
      },
    });
  }

  // For all other requests
  const response = NextResponse.next();

  // Add CORS headers only for allowed origins
  if (allowedOrigins.includes(origin)) {
    response.headers.set('Access-Control-Allow-Origin', origin);
    response.headers.set('Access-Control-Allow-Credentials', 'true');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  }

  return response;
}

// Define which routes this middleware should run on
export const config = {
  matcher: [
    '/api/:path*', // Apply to all API routes
    // Add other paths as needed
  ],
};
