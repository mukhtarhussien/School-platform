# School Pulse

منصة مدرسية ثنائية اللغة مبنية بـ Next.js App Router، ومربوطة بـ Neon Postgres عبر Drizzle ORM.

## التشغيل

```bash
npm install
cp .env.example .env.local
npm run db:push
npm run admin:bootstrap
npm run dev
```

## تسجيل الطلاب والمدرسين

- الدخول الأساسي للطلاب والمدرسين عبر **Google OAuth / OpenID Connect**.
- الطالب الجديد يختار **المتابعة باستخدام Google** ثم يكمل:
  - الاسم الثلاثي
  - تاريخ الولادة
  - رقم الهاتف العراقي
  - الصف
- عند الضغط على الإرسال يتحول الطلب إلى `pending` في Neon.
- تصل نسخة إشعار إلى حسابات الأدمن داخل لوحة الإدارة.
- الأدمن يراجع الطلب ثم يوافق أو يرفض ويستطيع إضافة سبب الرفض.
- لا يتم إنشاء جلسة للطالب قبل الموافقة.
- عند الموافقة يُنشأ حساب الطالب ويرتبط بمعرّف Google الفريد.

Google OAuth يستخدم Authorization Code Flow مع PKCE و`openid profile email`. يجب أن يطابق `GOOGLE_REDIRECT_URI` عنوان إعادة التوجيه المصرح به في Google Cloud Console.

### إعداد Google OAuth

1. أنشئ OAuth Client من نوع **Web application** في Google Cloud Console.
2. أضف `GOOGLE_REDIRECT_URI` ضمن Authorized redirect URIs، مثل: `https://your-domain.com/api/auth/google/callback`.
3. ضع `GOOGLE_CLIENT_ID` و`GOOGLE_CLIENT_SECRET` و`GOOGLE_REDIRECT_URI` في `.env.local`.
4. لا تضع مفاتيح Google أو كلمات مرور الإدارة داخل المستودع.

## حماية الدخول

- كلمات مرور حسابات الإدارة تستخدم `scrypt` مع salt عشوائي.
- بعد **5 محاولات كلمة مرور فاشلة** خلال نافذة الحماية يُقفل مفتاح المحاولة لمدة 15 دقيقة.
- القفل مربوط بالبريد وبالبريد+عنوان IP.
- يوجد Flood Guard مشترك مع Neon: **30 طلبًا خلال ثانية واحدة** على مفتاح الحماية يؤدي إلى حظر 15 دقيقة.
- الـFlood Guard يراقب أيضًا IP، وGoogle subject، والبريد، ورقم الهاتف في مسارات التسجيل الحساسة.
- الحظر يرجع `429` مع `Retry-After` عند الطلبات التي يصيدها الـproxy.

## Admin TOTP

حساب الإدارة يستخدم كلمة المرور ثم Google Authenticator (TOTP). الجلسة الإدارية لا تُنشأ قبل إتمام التحقق الثنائي. مفاتيح TOTP تُخزّن بشكل مشفر، وأكواد الاسترداد تُخزّن على شكل hashes.

## قاعدة البيانات

يجب تشغيل `npm run db:push` بعد تحديث الـschema. من الجداول الجديدة للمصادقة والتسجيل:

- `registration_requests`
- `login_attempts`
- `request_rate_limits`

## رفع الدرجات دفعيًا

من لوحة الإدارة يمكن رفع عدة درجات عبر CSV، سطر لكل درجة:

```text
student-email,assessment-id,score,feedback
```

## التخزين

جدول `files` يحفظ بيانات الملف والرابط. رفع الملفات الثنائية نفسه يعتمد على مزود تخزين خارجي (مثل Vercel Blob أو S3)؛ لا تُخزّن ملفات الطلاب الثنائية داخل Neon.
