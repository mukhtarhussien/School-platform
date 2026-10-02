import { NextResponse } from 'next/server'
import { exchangeGoogleCode, fetchGoogleProfile, readGoogleOAuthState, resolveGoogleLogin } from '@/lib/google'
import { isRequestFlooded } from '@/lib/security'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (url.searchParams.get('error')) return NextResponse.redirect(new URL('/login?error=google_cancelled', request.url))
  const state = await readGoogleOAuthState()
  if (!state || state.state !== url.searchParams.get('state')) return NextResponse.redirect(new URL('/login?error=google_state', request.url))
  const code = url.searchParams.get('code')
  if (!code) return NextResponse.redirect(new URL('/login?error=google_code', request.url))
  const tokens = await exchangeGoogleCode(code, state.verifier, url.origin)
  if (!tokens?.access_token) return NextResponse.redirect(new URL('/login?error=google_token', request.url))
  const profile = await fetchGoogleProfile(tokens.access_token)
  if (!profile) return NextResponse.redirect(new URL('/login?error=google_profile', request.url))
  const profileFlood = await isRequestFlooded([['google', profile.sub], ['email', profile.email]])
  if (profileFlood.blocked) return NextResponse.redirect(new URL('/login?error=rate_limited', request.url))

  const result = await resolveGoogleLogin(profile)
  if (result.kind === 'signed-in') return NextResponse.redirect(new URL('/', request.url))
  if (result.kind === 'admin-password') return NextResponse.redirect(new URL('/login?error=admin_google_blocked', request.url))
  if (result.kind === 'inactive') return NextResponse.redirect(new URL('/login?error=account_inactive', request.url))
  return NextResponse.redirect(new URL('/register', request.url))
}
