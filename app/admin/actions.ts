export async function confirmTotpSetupAction(
  _state: { ok?: boolean; error?: string; recoveryCodes?: string[] },
  fd: FormData
) {
  const admin = await guardAdmin({ allowUnconfigured: true })
  const code = str(fd, 'code')
  const encrypted = admin.twoFactorSecretEncrypted
  const secret = decryptTotpSecret(encrypted)

  if (!secret) {
    return {
      ok: false as const,
      error: 'ابدأ إعداد المصادقة الثنائية أولًا.',
    }
  }

  if (!verifyTotpCode(secret, code)) {
    return {
      ok: false as const,
      error: 'رمز TOTP غير صحيح. تأكد من الوقت في جهازك وجرّب الرمز الحالي.',
    }
  }

  const recoveryCodes = generateRecoveryCodes()

  await requireDb()
    .update(users)
    .set({
      twoFactorEnabled: true,
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
      updatedAt: new Date(),
    })
    .where(eq(users.id, admin.id))

  revalidatePath('/admin')
  revalidatePath('/admin/security')

  return {
    ok: true as const,
    recoveryCodes,
  }
}

export async function disableTotpAction(
  _state: { ok?: boolean; error?: string; recoveryCodes?: string[] },
  fd: FormData
) {
  const admin = await guardAdmin({ allowUnconfigured: true })
  const password = str(fd, 'password')
  const code = str(fd, 'code')
  const secret = decryptTotpSecret(admin.twoFactorSecretEncrypted)

  if (
    !verifyPassword(password, admin.passwordHash) ||
    !secret ||
    !verifyTotpCode(secret, code)
  ) {
    return {
      ok: false as const,
      error: 'كلمة المرور أو رمز المصادقة غير صحيح.',
    }
  }

  await requireDb()
    .update(users)
    .set({
      twoFactorEnabled: false,
      twoFactorSecretEncrypted: null,
      twoFactorRecoveryCodes: [],
      updatedAt: new Date(),
    })
    .where(eq(users.id, admin.id))

  revalidatePath('/admin/security')

  return {
    ok: true as const,
  }
}

export async function regenerateRecoveryCodesAction(
  _state: { ok?: boolean; error?: string; recoveryCodes?: string[] },
  fd: FormData
) {
  const admin = await guardAdmin({ allowUnconfigured: true })
  const password = str(fd, 'password')
  const code = str(fd, 'code')
  const secret = decryptTotpSecret(admin.twoFactorSecretEncrypted)

  if (
    !admin.twoFactorEnabled ||
    !verifyPassword(password, admin.passwordHash) ||
    !secret ||
    !verifyTotpCode(secret, code)
  ) {
    return {
      ok: false as const,
      error: 'كلمة المرور أو رمز المصادقة غير صحيح.',
    }
  }

  const recoveryCodes = generateRecoveryCodes()

  await requireDb()
    .update(users)
    .set({
      twoFactorRecoveryCodes: recoveryCodes.map(hashRecoveryCode),
      updatedAt: new Date(),
    })
    .where(eq(users.id, admin.id))

  return {
    ok: true as const,
    recoveryCodes,
  }
}
