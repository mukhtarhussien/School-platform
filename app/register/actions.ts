'use server'

import { redirect } from 'next/navigation'
import { and, eq } from 'drizzle-orm'
import { requireDb } from '@/db'
import { classes, notifications, registrationRequests, users } from '@/db/schema'
import { getRegistrationContext } from '@/lib/google'
import { isRequestFlooded, isValidIraqiPhone, isValidTripleName, normalizeFullName, normalizePhone } from '@/lib/security'

const value = (fd: FormData, key: string) => String(fd.get(key) ?? '').trim()

export async function submitRegistrationAction(fd: FormData) {
  const request = await getRegistrationContext()
  if (!request) redirect('/login?error=registration_expired')
  if (request.status !== 'draft') redirect('/register')

  const fullName = normalizeFullName(value(fd, 'fullName'))
  const birthDate = value(fd, 'birthDate')
  const phone = normalizePhone(value(fd, 'phone'))
  const classId = value(fd, 'classId')

  const flood = await isRequestFlooded([
    ['google', request.googleSubject],
    ['email', request.email],
    ['phone', phone],
  ])
  if (flood.blocked) redirect('/register?error=rate_limited')

  if (!isValidTripleName(fullName)) redirect('/register?error=name')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) redirect('/register?error=birth_date')
  const parsedBirthDate = new Date(`${birthDate}T00:00:00.000Z`)
  if (Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate > new Date()) redirect('/register?error=birth_date')
  if (!isValidIraqiPhone(phone)) redirect('/register?error=phone')

  const database = requireDb()
  const classRow = await database.select({ id: classes.id }).from(classes).where(eq(classes.id, classId)).limit(1)
  if (!classRow[0]) redirect('/register?error=class')

  const existingPhone = await database.select({ id: users.id }).from(users).where(eq(users.phone, phone)).limit(1)
  if (existingPhone[0]) redirect('/register?error=phone_taken')

  const duplicatePending = await database.select({ id: registrationRequests.id })
    .from(registrationRequests)
    .where(and(eq(registrationRequests.phone, phone), eq(registrationRequests.status, 'pending')))
    .limit(1)
  if (duplicatePending[0]) redirect('/register?error=phone_pending')

  await database.update(registrationRequests).set({
    fullName,
    birthDate,
    phone,
    classId,
    status: 'pending',
    updatedAt: new Date(),
    rejectionReason: null,
  }).where(eq(registrationRequests.id, request.id))

  const admins = await database.select({ id: users.id }).from(users).where(and(eq(users.role, 'admin'), eq(users.isActive, true)))
  if (admins.length) {
    await database.insert(notifications).values(admins.map(admin => ({
      userId: admin.id,
      titleAr: 'طلب تسجيل طالب جديد',
      titleEn: 'New student registration request',
      bodyAr: `${fullName} أرسل طلب تسجيل عبر Google. الهاتف: ${phone}`,
      bodyEn: `${fullName} submitted a registration request through Google. Phone: ${phone}`,
    })))
  }

  redirect('/register?submitted=1')
}
