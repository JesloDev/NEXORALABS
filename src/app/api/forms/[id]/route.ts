import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, forbidden, notFound, getClientInfo } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'
import { sanitizeQuestions, parseQuestions } from '@/lib/forms'
import { formShape } from '@/lib/forms-api'
import { logActivity } from '@/lib/activity'

export const dynamic = 'force-dynamic'

async function load(id: string) {
  const me = await getActiveSessionUser()
  if (!me) return { err: json({ error: 'Unauthorized' }, 401) }
  const form = await db.feedbackForm.findUnique({ where: { id }, include: { _count: { select: { responses: true } } } })
  if (!form) return { err: notFound('Form not found.') }
  const acc = await spaceAccess(me, form.spaceId)
  if (!acc || !acc.canViewContent) return { err: notFound('Form not found.') }
  if (!acc.canManage) return { err: forbidden('Only space owners and admins can manage feedback forms.') }
  return { me, form }
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const r = await load((await params).id)
  if (r.err) return r.err
  return json({ form: { ...formShape(r.form), questions: parseQuestions(r.form!.questions) } })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await load(id)
  if (r.err) return r.err
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid body') }
  const data: any = {}
  if (typeof body?.title === 'string') {
    const t = body.title.trim().slice(0, 120)
    if (t.length < 2) return badRequest('Give the form a title.')
    data.title = t
  }
  if (typeof body?.description === 'string') data.description = body.description.trim().slice(0, 1000) || null
  if (typeof body?.open === 'boolean') data.open = body.open
  if (body?.questions !== undefined) {
    const qs = sanitizeQuestions(body.questions)
    if (typeof qs === 'string') return badRequest(qs)
    data.questions = JSON.stringify(qs)
  }
  const form = await db.feedbackForm.update({ where: { id }, data, include: { _count: { select: { responses: true } } } })
  logActivity({ userId: r.me!.id, action: 'form.update', details: { formId: id, fields: Object.keys(data) }, ...getClientInfo(req) })
  return json({ form: { ...formShape(form), questions: parseQuestions(form.questions) } })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const r = await load(id)
  if (r.err) return r.err
  await db.feedbackForm.delete({ where: { id } })
  logActivity({ userId: r.me!.id, action: 'form.delete', details: { formId: id }, ...getClientInfo(req) })
  return json({ ok: true })
}
