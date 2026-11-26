import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { json, badRequest, notFound } from '@/lib/api-helpers'
import { parseQuestions, validateAnswers } from '@/lib/forms'

export const dynamic = 'force-dynamic'

// Public form. Only the title, description and questions are exposed: nothing about the space or the app.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const f = await db.feedbackForm.findUnique({ where: { token } })
  if (!f) return notFound('This form does not exist.')
  if (!f.open) return json({ error: 'This form is no longer accepting responses.' }, 410)
  return json({ form: { title: f.title, description: f.description, questions: parseQuestions(f.questions) } })
}

// best-effort per-instance throttle against bot floods (20 submissions / 10 min per IP+form)
const hits = new Map<string, number[]>()
function limited(key: string) {
  const now = Date.now()
  const arr = (hits.get(key) || []).filter((t) => now - t < 600_000)
  if (arr.length >= 20) { hits.set(key, arr); return true }
  arr.push(now); hits.set(key, arr)
  if (hits.size > 5000) hits.clear()
  return false
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
  if (limited(`${ip}:${token}`)) return json({ error: 'Too many submissions. Try again in a few minutes.' }, 429)
  const f = await db.feedbackForm.findUnique({ where: { token } })
  if (!f) return notFound('This form does not exist.')
  if (!f.open) return json({ error: 'This form is no longer accepting responses.' }, 410)
  let body: any
  try { body = await req.json() } catch { return badRequest('Invalid request.') }
  if (body?.website) return json({ ok: true }) // honeypot field: real people never fill it
  const answers = validateAnswers(parseQuestions(f.questions), body?.answers)
  if (typeof answers === 'string') return badRequest(answers)
  if (!Object.keys(answers).length) return badRequest('Please answer at least one question.')
  await db.feedbackResponse.create({ data: { formId: f.id, answers: JSON.stringify(answers) } })
  return json({ ok: true })
}
