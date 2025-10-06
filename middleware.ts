/**
 * Next.js Middleware for cache optimization
 * Xử lý cache headers và optimization
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()

  // Add cache headers based on path
  const pathname = request.nextUrl.pathname

  // Static assets - cache for 1 year
  if (pathname.startsWith('/_next/static/') || 
      pathname.startsWith('/images/') || 
      pathname.startsWith('/fonts/') ||
      pathname.match(/\.(ico|png|jpg|jpeg|gif|svg|css|js|woff|woff2|ttf|eot)$/)) {
    response.headers.set('Cache-Control', 'public, max-age=31536000, immutable')
  }
  
  // API routes - cache for 5 minutes
  else if (pathname.startsWith('/api/')) {
    response.headers.set('Cache-Control', 'public, max-age=300, s-maxage=300')
  }
  
  // Dashboard pages - cache for 1 hour
  else if (pathname.startsWith('/dashboard/')) {
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  }
  
  // Other pages - cache for 1 hour
  else {
    response.headers.set('Cache-Control', 'public, max-age=3600, s-maxage=3600')
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
  response.headers.set('X-DNS-Prefetch-Control', 'on')

  // Add CORS headers for API routes
  if (pathname.startsWith('/api/')) {
    response.headers.set('Access-Control-Allow-Origin', '*')
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
