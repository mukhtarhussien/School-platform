import Link from 'next/link'
import { eq } from 'drizzle-orm'
import { Clock3, Mail, ShieldCheck, UserPlus } from 'lucide-react'
import { requireDb } from '@/db'
import { classes } from '@/db/schema'
import { getRegistrationContext } from '@/lib/google'
import { submitRegistrationAction } from './actions'

export const dynamic = 'force-dynamic'

function errorMessage(error: string | undefined) {
  const messages: Record<string,string> = {
    rate_limited: 'تم إيقاف الطلبات مؤقتًا بسبب عدد كبير من المحاولات. جرّب بعد انتهاء فترة الحظر.',
    name: 'اكتب الاسم الثلاثي أو أكثر، باستخدام الحروف فقط.',
    birth_date: 'تاريخ الميلاد غير صالح.',
    phone: 'رقم الهاتف العراقي غير صالح.',
    phone_taken: 'رقم الهاتف مرتبط بحساب موجود مسبقًا.',
    phone_pending: 'هناك طلب تسجيل قيد المراجعة بهذا الرقم.',
    class: 'الصف المحدد غير موجود.',
    registration_expired: 'انتهت جلسة التسجيل. ابدأ تسجيل Google من جديد.',
  }
  return error ? messages[error] ?? 'تعذر إرسال الطلب.' : null
}

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ error?:string; submitted?:string }> }) {
  const query = await searchParams
  const request = await getRegistrationContext()
  const classesRows = await requireDb().select({id:classes.id,nameAr:classes.nameAr,nameEn:classes.nameEn,gradeLevel:classes.gradeLevel,section:classes.section}).from(classes).orderBy(classes.gradeLevel, classes.nameAr)
  const error = errorMessage(query.error)

  if (!request) return <main className="auth-page"><div className="auth-card card"><span className="eyebrow">REGISTRATION</span><h1>التسجيل غير متاح بهذه الجلسة</h1><p>ارجع إلى تسجيل الدخول وابدأ من Google حتى يتم ربط الطلب بحسابك.</p><Link href="/login" className="button button-primary">العودة لتسجيل الدخول</Link></div></main>

  if (request.status === 'approved') return <main className="auth-page"><div className="auth-card card"><div className="auth-security-icon"><ShieldCheck size={22}/></div><span className="eyebrow">APPROVED</span><h1>تمت الموافقة</h1><p>تم إنشاء حسابك. سجّل الدخول باستخدام حساب Google نفسه.</p><Link href="/api/auth/google" className="button button-primary">الدخول باستخدام Google</Link></div></main>
  if (request.status === 'pending') return <main className="auth-page"><div className="auth-card card"><div className="auth-security-icon"><Clock3 size={22}/></div><span className="eyebrow">PENDING APPROVAL</span><h1>طلبك قيد المراجعة</h1><p>تم إرسال بياناتك إلى إدارة المدرسة. لن يتم إنشاء جلسة دخول قبل موافقة الأدمن.</p><div className="registration-summary"><div><span>Google</span><strong>{request.email}</strong></div><div><span>الاسم</span><strong>{request.fullName}</strong></div><div><span>الهاتف</span><strong dir="ltr">{request.phone}</strong></div></div><Link href="/login" className="auth-secondary">العودة لتسجيل الدخول</Link></div></main>
  if (request.status === 'rejected') return <main className="auth-page"><div className="auth-card card"><div className="auth-security-icon"><ShieldCheck size={22}/></div><span className="eyebrow">REGISTRATION</span><h1>تم رفض الطلب</h1><p>{request.rejectionReason || 'يمكنك بدء طلب جديد من خلال حساب Google.'}</p><Link href="/api/auth/google" className="button button-primary">بدء طلب جديد عبر Google</Link><Link href="/login" className="auth-back">العودة لتسجيل الدخول</Link></div></main>

  return <main className="auth-page"><div className="auth-card card registration-card"><div className="auth-security-icon"><UserPlus size={22}/></div><span className="eyebrow">STUDENT REGISTRATION</span><h1>إنشاء حساب طالب</h1><p>تمت مصادقة Google بنجاح. أكمل بياناتك حتى يصل الطلب إلى الإدارة للموافقة.</p>{query.submitted === '1' && <div className="form-success">تم إرسال الطلب. سيتم إنشاء الحساب بعد موافقة الإدارة.</div>}{error && <div className="form-error">{error}</div>}<div className="registration-google"><Mail size={16}/><span>{request.email}</span></div><form action={submitRegistrationAction} className="form-stack"><label>الاسم الثلاثي<input name="fullName" defaultValue={request.fullName ?? request.googleName ?? ''} autoComplete="name" required /></label><label>تاريخ الولادة<input name="birthDate" type="date" required /></label><label>رقم الهاتف<input name="phone" type="tel" inputMode="tel" placeholder="07xxxxxxxxx" autoComplete="tel" required /></label><label>الصف<select name="classId" required defaultValue={request.classId ?? ''}><option value="">اختر الصف</option>{classesRows.map(c=><option key={c.id} value={c.id}>{c.nameAr} · المرحلة {c.gradeLevel}{c.section ? ` · ${c.section}` : ''}</option>)}</select></label><button className="button button-primary" type="submit">إرسال الطلب إلى الإدارة</button></form><p className="registration-note">لا يُستخدم رقم الهاتف لتسجيل الدخول؛ هو جزء من بيانات الطالب فقط.</p><Link href="/login" className="auth-back">إلغاء والعودة</Link></div></main>
}
