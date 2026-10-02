import { NextResponse } from 'next/server'
import { beginGoogleOAuth, googleConfigured } from '@/lib/google'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  if (!googleConfigured() || (process.env.NODE_ENV === 'production' && !process.env.GOOGLE_REDIRECT_URI)) return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url))
  const ip = await getClientIp()
  const flood = await isRequestFlooded([['ip', ip]])
  if (flood.blocked) return NextResponse.redirect(new URL('/login?error=rate_limited', request.url))
  try {
    const url = await beginGoogleOAuth(origin)
    return NextResponse.redirect(url)
  } catch {
    return NextResponse.redirect(new URL('/login?error=google_not_configured', request.url))
  }
}
