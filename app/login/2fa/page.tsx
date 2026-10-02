import Link from 'next/link'
import { ShieldCheck } from 'lucide-react'
import { verifyTwoFactorAction, cancelTwoFactorAction } from '../actions'

export default async function TwoFactorLogin({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams
  const message = error === 'missing' ? 'أدخل رمز التحقق.' : error === 'invalid' ? 'رمز غير صحيح. جرّب رمزًا جديدًا.' : error === 'expired' ? 'انتهت جلسة التحقق. سجّل الدخول من جديد.' : error === 'locked' ? 'تم إيقاف محاولة التحقق هذه بعد عدة محاولات فاشلة.' : 'أكمل التحقق بخطوتين.'
  return <main className="auth-page"><div className="auth-card card"><div className="auth-security-icon"><ShieldCheck size={24}/></div><span className="eyebrow">ADMIN SECURITY</span><h1>التحقق بخطوتين</h1><p>أدخل رمز Google Authenticator المكوّن من 6 أرقام، أو أحد أكواد الاسترداد.</p><div className="form-error" data-tone={error === 'invalid' ? 'error' : 'info'}>{message}</div><form action={verifyTwoFactorAction} className="form-stack"><label>رمز التحقق<input name="code" inputMode="numeric" autoComplete="one-time-code" placeholder="123456" maxLength={12} required /></label><button className="button button-primary" type="submit">تحقق ودخول</button></form><form action={cancelTwoFactorAction}><button className="auth-secondary" type="submit">إلغاء</button></form><Link href="/login" className="auth-back">العودة لتسجيل الدخول</Link></div></main>
}
