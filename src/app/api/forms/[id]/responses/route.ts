import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, forbidden, notFound } from '@/lib/api-helpers'
import { getActiveSessionUser } from '@/lib/session'
import { spaceAccess } from '@/lib/access'
import { parseQuestions, answerText } from '@/lib/forms'

export const dynamic = 'force-dynamic'

const csvCell = (v: string) => { const s = /^[=+\-@\t\r]/.test(v) ? "'" + v : v; return `"${s.replace(/"/g, '""')}"` } // also blocks spreadsheet formula injection

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const me = await getActiveSessionUser()
  if (!me) return json({ error: 'Unauthorized' }, 401)
  const { id } = await params
  const form = await db.feedbackForm.findUnique({ where: { id } })
  if (!form) return notFound('Form not found.')
  const acc = await spaceAccess(me, form.spaceId)
  if (!acc || !acc.canViewContent) return notFound('Form not found.')
  if (!acc.canManage) return forbidden('Only space owners and admins can see responses.')

  const questions = parseQuestions(form.questions)
  const rows = await db.feedbackResponse.findMany({ where: { formId: id }, orderBy: { createdAt: 'desc' }, take: 5000 })
  const responses = rows.map((r) => { let a = {}; try { a = JSON.parse(r.answers) } catch {} return { id: r.id, createdAt: r.createdAt, answers: a as Record<string, any> } })

  if (new URL(req.url).searchParams.get('format') === 'csv') {
    const head = ['Submitted', ...questions.map((q) => q.label)].map(csvCell).join(',')
    const lines = responses.map((r) => [r.createdAt.toISOString(), ...questions.map((q) => answerText(r.answers[q.id]))].map(csvCell).join(','))
    return new Response([head, ...lines].join('\r\n'), {
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${form.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 40) || 'responses'}.csv"` },
    })
  }
  return json({ questions, responses })
}
