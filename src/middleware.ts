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

  // Redirect non-locale routes to locale equivalents (Avalanche EVM only)
  const isLocalePrefixed = pathname.startsWith('/en/') || pathname.startsWith('/es/')
  if (!isLocalePrefixed) {
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

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/models/:path*', '/upload/:path*', '/licenses/:path*', '/debug/:path*'],
}
