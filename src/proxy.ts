import { NextResponse, type NextRequest } from 'next/server'
import { resolveHost } from '@/lib/hosts'

// Ordnet jede Anfrage anhand des Hostnamens der Plattform oder einem Betrieb zu
// und schreibt den Pfad intern um:
//   <plattform-domain>/x        -> /platform/x
//   <slug>.<plattform-domain>/x -> /site/s-<slug>/x
//   <eigene-domain>/x           -> /site/d-<domain>/x
// Außerdem werden pro Anfrage ein CSP-Nonce und Sicherheits-Header gesetzt.

const isDev = process.env.NODE_ENV === 'development'

function platformHost() {
  try {
    return new URL(process.env.PLATFORM_BASE_URL ?? 'http://localhost:3000').hostname.toLowerCase()
  } catch {
    return 'localhost'
  }
}

function contentSecurityPolicy(nonce: string, https: boolean) {
  const directives = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? ` 'unsafe-eval'` : ''}`,
    isDev ? `style-src 'self' 'unsafe-inline'` : `style-src 'self' 'nonce-${nonce}'`,
    `style-src-attr 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src 'self'${isDev ? ' ws: wss:' : ''}`,
    `manifest-src 'self'`,
    `worker-src 'self'`,
    `object-src 'none'`,
    `base-uri 'none'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
  ]
  if (https) directives.push('upgrade-insecure-requests')
  return directives.join('; ')
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const singleTenantSlug = process.env.SINGLE_TENANT_SLUG?.trim() || undefined

  let target: string | null = null
  if (singleTenantSlug && (pathname === '/plattform' || pathname.startsWith('/plattform/'))) {
    target = `/platform${pathname.slice('/plattform'.length)}`
  } else {
    const context = resolveHost(request.headers.get('host'), { platformHost: platformHost(), singleTenantSlug })
    if (context?.kind === 'platform') target = `/platform${pathname}`
    else if (context?.kind === 'tenant') target = `/site/${context.key}${pathname}`
  }

  if (!target) {
    return new NextResponse('Unbekannte Domain.', { status: 404, headers: { 'content-type': 'text/plain; charset=utf-8' } })
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64')
  const https = request.nextUrl.protocol === 'https:' || request.headers.get('x-forwarded-proto') === 'https'
  const csp = contentSecurityPolicy(nonce, https)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  requestHeaders.set('Content-Security-Policy', csp)
  requestHeaders.set('x-pathname', pathname)

  const url = request.nextUrl.clone()
  url.pathname = target
  const response = NextResponse.rewrite(url, { request: { headers: requestHeaders } })
  response.headers.set('Content-Security-Policy', csp)
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|api/internal|sw\\.js|offline\\.html|favicon\\.ico|robots\\.txt).*)',
  ],
}
