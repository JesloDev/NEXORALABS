import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { logActivity } from '@/lib/activity'
import { sendEmail, emailShell } from '@/lib/email'

export const dynamic = 'force-dynamic'

// Update the signed-in user's profile (name, title, department, phone, bio, location, image)
export async function PATCH(req: NextRequest) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)

  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request body') }

  const data: any = {}
  if (typeof body?.name === 'string' && body.name.trim().length >= 2) data.name = body.name.trim()
  if (typeof body?.title === 'string') data.title = body.title.trim() || null
  if (typeof body?.department === 'string') data.department = body.department.trim() || null
  if (typeof body?.phone === 'string') data.phone = body.phone.trim() || null
  if (typeof body?.bio === 'string') data.bio = body.bio.trim() || null
  if (typeof body?.location === 'string') data.location = body.location.trim() || null
  if (typeof body?.image === 'string') data.image = body.image.trim() || null

  if (Object.keys(data).length === 0) return badRequest('No fields to update.')

  const updated = await db.user.update({
    where: { id: me.id },
    data,
    select: { id: true, name: true, title: true, department: true, phone: true, bio: true, location: true, image: true },
  })

  const { ip, userAgent } = getClientInfo(req)
  await logActivity({ userId: me.id, action: 'profile_update', details: { fields: Object.keys(data) }, ip, userAgent })

  // Notify the user (in-app + email) that their profile was changed
  await db.notification.create({
    data: { userId: me.id, type: 'ACCOUNT_CHANGE', title: 'Your profile was updated', body: `You updated: ${Object.keys(data).join(', ')}.` },
  }).catch(() => {})
  // Only send an email if the name changed (avoid spamming on every tiny edit)
  if (data.name && data.name !== me.name) {
    await sendEmail({
      to: me.email,
      subject: 'Your NEXORALABS profile was updated',
      html: emailShell({
        title: 'Profile updated',
        preheader: 'Your name on NEXORALABS has changed.',
        bodyHtml: `<p>Hi ${data.name},</p>
          <p>Your NEXORALABS profile was just updated. If this wasn't you, please contact an administrator.</p>`,
      }),
      text: `Hi ${data.name}, your NEXORALABS profile name was updated. If this wasn't you, contact an administrator.`,
    }).catch(() => {})
  }

  return json({ user: updated })
}
