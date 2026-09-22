import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo, genToken } from '@/lib/api-helpers'
import { hashPassword } from '@/lib/password'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return badRequest('Invalid request body')
  }
  const token = (body?.token || '').trim()
  const email = (body?.email || '').trim().toLowerCase()
  const name = (body?.name || '').trim()
  const password = body?.password || ''
  const title = (body?.title || '').trim() || null
  const department = (body?.department || '').trim() || null
  const phone = (body?.phone || '').trim() || null

  if (!token) return badRequest('Missing invite token.')
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return badRequest('A valid email is required.')
  if (!name || name.length < 2) return badRequest('Please enter your full name.')
  if (password.length < 8) return badRequest('Password must be at least 8 characters.')

  // Validate invite. expired ONLY if date passed OR uses exhausted OR inactive.
  const invite = await db.inviteLink.findUnique({ where: { token } })
  if (!invite) return badRequest('This invite link does not exist.')
  const now = new Date()
  if (invite.expiresAt < now) return badRequest('This invite link has expired.')
  if (invite.currentUses >= invite.maxUses) return badRequest('This invite link has reached its maximum uses.')
  if (!invite.active) return badRequest('This invite link is no longer active.')

  // Existing users with this email: reject if already a real (verified) user.
  const existing = await db.user.findUnique({ where: { email } })
  if (existing && existing.emailVerified) {
    return badRequest('An account with this email already exists. Please sign in.')
  }
  // Hanging unverified record → overwrite it so they can complete registration.
  const passwordHash = await hashPassword(password)
  const verifyToken = genToken()
  const verifyExpiry = new Date(Date.now() + 1000 * 60 * 60 * 24)

  if (existing && !existing.emailVerified) {
    // reuse id, clear hanging state
    await db.user.update({
      where: { id: existing.id },
      data: {
        name, password: passwordHash, title, department, phone,
        role: 'EMPLOYEE',
        status: 'PENDING',
        emailVerified: null,
        verifyToken, verifyTokenExpiry: verifyExpiry,
        inviteLinkId: invite.id,
        rejectedAt: null, rejectedReason: null,
      },
    })
  } else {
    await db.user.create({
      data: {
        email, name, password: passwordHash, title, department, phone,
        role: 'EMPLOYEE',
        status: 'PENDING',
        emailVerified: null,
        verifyToken, verifyTokenExpiry: verifyExpiry,
        inviteLinkId: invite.id,
      },
    })
  }

  const verifyUrl = `${baseUrl}/auth/verify-email?token=${verifyToken}`
  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ action: 'invite_register', details: { email, inviteId: invite.id }, ip, userAgent })

  const html = emailShell({
    title: 'Verify your email to finish registration',
    preheader: 'One step left to verify your NEXORALABS email.',
    bodyHtml: `<p>Hi ${name},</p>
      <p>Welcome to NEXORALABS! You've been invited to join the internal team. Before your registration is reviewed by an administrator, please verify your email address.</p>
      <p>Click below to confirm. This link expires in 24 hours.</p>`,
    cta: { label: 'Verify my email', href: verifyUrl },
  })
  const emailResult = await sendEmail({
    to: email,
    subject: 'Verify your email — NEXORALABS',
    html,
    text: `Verify your email to complete NEXORALABS registration: ${verifyUrl}`,
  })

  return json({
    ok: true,
    needsVerification: true,
    devVerifyUrl: (emailResult as any)?.dev ? verifyUrl : undefined,
  })
}
