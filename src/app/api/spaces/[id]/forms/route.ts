import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound, genToken, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'
import { sanitizeQuestions } from '@/lib/forms'
import { formShape } from '@/lib/forms-api'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

async function manager(id: string) {
  const me = await getActiveSessionUser()
  if (!me) return { err: json({ error: 'Unauthorized' }, 401) }
  const acc = await spaceAccess(me, id)
  if (!acc || !acc.canViewContent) return { err: notFound('Space not found.') }
  if (!acc.canManage) return { err: forbidden('Only space owners and admins can manage feedback forms.') }
  return { me, acc }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await manager(id)
  if (m.err) return m.err
  const forms = await db.feedbackForm.findMany({ where: { spaceId: id }, orderBy: { createdAt: 'desc' }, include: { _count: { select: { responses: true } } } })
  return json({ forms: forms.map(formShape) })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const m = await manager(id)
  if (m.err) return m.err
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const title = String(body?.title || '').trim().slice(0, 120)
  if (title.length < 2) return badRequest('Give the form a title.')
  const description = String(body?.description || '').trim().slice(0, 1000) || null
  const qs = sanitizeQuestions(body?.questions ?? [])
  if (typeof qs === 'string') return badRequest(qs)
  const form = await db.feedbackForm.create({
    data: { spaceId: id, token: genToken(16), title, description, questions: JSON.stringify(qs), createdBy: m.me!.id },
    include: { _count: { select: { responses: true } } },
  })
  logActivity({ userId: m.me!.id, action: 'form.create', details: { spaceId: id, formId: form.id }, ...getClientInfo(req) })
  return json({ form: formShape(form) })
}
