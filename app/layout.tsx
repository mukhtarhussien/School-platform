import type { Metadata } from 'next'
import './globals.css'
import { AppShell } from '@/components/app-shell'
import { getCurrentUser } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'مدرستي | School Pulse',
  description: 'A bilingual school management portal backed by Neon Postgres.',
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const user=await getCurrentUser()
  return <html lang="ar" dir="rtl"><body><AppShell currentUser={user}>{children}</AppShell></body></html>
}
