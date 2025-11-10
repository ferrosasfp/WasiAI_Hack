import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

function getLocale(req: NextRequest) {
  const lang = req.cookies.get('lang')?.value
  return lang === 'es' ? 'es' : 'en'
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const locale = getLocale(req)

  // Redirect root path to locale landing
  if (pathname === '/') {
    const url = req.nextUrl.clone()
    url.pathname = `/${locale}`
    return NextResponse.redirect(url)
  }

  // EVM-only guards: if SUI disabled, redirect SUI (non-locale) routes to locale EVM pages
  const enableSui = (process.env.NEXT_PUBLIC_ENABLE_SUI || '').toLowerCase() === 'true'
  if (!enableSui) {
    // Only apply to top-level non-locale paths
    const isLocalePrefixed = pathname.startsWith('/en/') || pathname.startsWith('/es/')
    if (!isLocalePrefixed) {
      // Map non-locale SUI routes to locale equivalents
      const map: Array<{ test: RegExp, to: string }> = [
        { test: /^\/models(?:\/.*)?$/, to: `/${locale}/models` },
        { test: /^\/upload(?:\/.*)?$/, to: `/${locale}/publish/wizard` },
        { test: /^\/licenses(?:\/.*)?$/, to: `/${locale}/licenses` },
        { test: /^\/debug(?:\/.*)?$/, to: `/${locale}` },
      ]
      for (const r of map) {
        if (r.test.test(pathname)) {
          const url = req.nextUrl.clone()
          url.pathname = r.to
          return NextResponse.redirect(url)
        }
      }
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/models/:path*', '/upload/:path*', '/licenses/:path*', '/debug/:path*'],
}
