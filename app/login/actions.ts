'use server'
import { redirect } from 'next/navigation'
import { eq } from 'drizzle-orm'
import { requireDb } from '@/db'
import { users } from '@/db/schema'
import { checkPasswordLock, clearPasswordFailures, getClientIp, isRequestFlooded, recordPasswordFailure } from '@/lib/security'
import { clearTwoFactorChallenge, createSession, createTwoFactorChallenge, hashPassword, verifyPassword, verifyTwoFactorChallenge } from '@/lib/auth'

const DUMMY_PASSWORD_HASH = hashPassword('school-pulse-dummy-password')

export async function loginAction(formData: FormData) {
  const email = String(formData.get('email') || '').trim().toLowerCase()
  const password = String(formData.get('password') || '')
  if (!email || !password) redirect('/login?error=missing')
  const ip = await getClientIp()
  const flood = await isRequestFlooded([['email', email]])
  if (flood.blocked) redirect('/login?error=rate_limited')
  const passwordLock = await checkPasswordLock([['email-ip', `${email}:${ip}`], ['email', email]])
  if (passwordLock.blocked) redirect('/login?error=password_locked')

  const rows = await requireDb().select().from(users).where(eq(users.email, email)).limit(1)
  const user = rows[0]
  const passwordValid = verifyPassword(password, user?.passwordHash ?? DUMMY_PASSWORD_HASH)
  if (!user || !user.isActive || !passwordValid) {
    const result = await recordPasswordFailure([['email-ip', `${email}:${ip}`], ['email', email]])
    redirect(`/login?error=${result.blocked ? 'password_locked' : 'invalid'}`)
  }
  await clearPasswordFailures([['email-ip', `${email}:${ip}`], ['email', email]])
  if (user.role === 'admin' && user.twoFactorEnabled) {
    await createTwoFactorChallenge(user.id)
    redirect('/login/2fa')
  }
  await createSession(user.id)
  redirect(user.role === 'admin' ? '/admin/security?setup=1' : '/')
}

export async function verifyTwoFactorAction(formData: FormData) {
  const code = String(formData.get('code') || '')
  if (!code) redirect('/login/2fa?error=missing')
  const result = await verifyTwoFactorChallenge(code)
  if (!result.ok) redirect(`/login/2fa?error=${result.reason}`)
  redirect('/admin')
}

export async function cancelTwoFactorAction() {
  await clearTwoFactorChallenge()
  redirect('/login')
}
