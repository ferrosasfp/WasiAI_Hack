import { NextRequest, NextResponse } from 'next/server'
import createMiddleware from 'next-intl/middleware';

const LOCALES = ['en','es'] as const
const DEFAULT_LOCALE = 'en'
const intlMiddleware = createMiddleware({ locales: LOCALES as unknown as string[], defaultLocale: DEFAULT_LOCALE, localeDetection: true })

function normalizeLocale(v?: string | null): 'en'|'es' {
  if (!v) return DEFAULT_LOCALE
  const s = v.toLowerCase()
  if (s.startsWith('es')) return 'es'
  return 'en'
}

export default function middleware(req: NextRequest) {
  const { nextUrl, headers, cookies } = req
  const url = nextUrl.clone()

  // legacy ?lang support removed; only localized routes are supported

  const seg = url.pathname.split('/')[1]
  const hasLocaleInPath = LOCALES.includes(seg as any)

  // 2) For root or paths without locale, decide locale via cookie or Accept-Language
  if (!hasLocaleInPath) {
    const cookieLang = normalizeLocale(cookies.get('lang')?.value)
    const accept = headers.get('accept-language') || ''
    const detected = normalizeLocale(accept)
    const target = cookieLang || detected || DEFAULT_LOCALE
    const redirectUrl = url.clone()
    redirectUrl.pathname = `/${target}${url.pathname}`
    const res = NextResponse.redirect(redirectUrl)
    res.cookies.set('lang', target, { path: '/', maxAge: 60*60*24*365 })
    return res
  }

  // 3) Already localized path: ensure cookie aligns, then delegate to next-intl
  const currentLocale = seg as 'en'|'es'
  const res = intlMiddleware(req)
  if (cookies.get('lang')?.value !== currentLocale) {
    res.cookies.set('lang', currentLocale, { path: '/', maxAge: 60*60*24*365 })
  }
  return res
}

// Apply to all routes except api, _next, _vercel and static files
export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}
