// Feedback form questions + answers: shared by the builder, the public form and the API.
export type QType = 'SHORT' | 'LONG' | 'CHOICE' | 'CHECKBOX' | 'DROPDOWN' | 'RATING'
export interface Question { id: string; type: QType; label: string; required: boolean; options?: string[] }

export const Q_TYPES: { value: QType; label: string }[] = [
  { value: 'SHORT', label: 'Short answer' },
  { value: 'LONG', label: 'Paragraph' },
  { value: 'CHOICE', label: 'Multiple choice' },
  { value: 'CHECKBOX', label: 'Checkboxes' },
  { value: 'DROPDOWN', label: 'Dropdown' },
  { value: 'RATING', label: 'Rating (1-5)' },
]
const TYPES = Q_TYPES.map((t) => t.value)
export const hasOptions = (t: QType) => t === 'CHOICE' || t === 'CHECKBOX' || t === 'DROPDOWN'

export function parseQuestions(raw: string): Question[] {
  try { const v = JSON.parse(raw); return Array.isArray(v) ? v : [] } catch { return [] }
}

// Cleans questions coming from the builder. Returns an error string when invalid.
export function sanitizeQuestions(input: unknown): Question[] | string {
  if (!Array.isArray(input)) return 'Questions must be a list.'
  if (input.length > 50) return 'A form can have at most 50 questions.'
  const seen = new Set<string>()
  const out: Question[] = []
  for (const q of input as any[]) {
    const label = String(q?.label ?? '').trim().slice(0, 300)
    if (!label) return 'Every question needs a title.'
    const type = TYPES.includes(q?.type) ? (q.type as QType) : 'SHORT'
    let id = String(q?.id ?? '').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24)
    if (!id || seen.has(id)) id = 'q' + Math.random().toString(36).slice(2, 9)
    seen.add(id)
    const item: Question = { id, type, label, required: !!q?.required }
    if (hasOptions(type)) {
      const opts = Array.isArray(q?.options) ? q.options.map((o: unknown) => String(o ?? '').trim().slice(0, 120)).filter(Boolean) : []
      const uniq = Array.from(new Set<string>(opts)).slice(0, 30)
      if (uniq.length < 2) return `"${label}" needs at least two options.`
      item.options = uniq
    }
    out.push(item)
  }
  return out
}

export type Answers = Record<string, string | string[] | number>

// Validates a respondent's answers against the form. Unknown keys are dropped.
export function validateAnswers(questions: Question[], raw: unknown): Answers | string {
  const input = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const out: Answers = {}
  for (const q of questions) {
    const v = input[q.id]
    const empty = v === undefined || v === null || v === '' || (Array.isArray(v) && v.length === 0)
    if (empty) { if (q.required) return `Please answer: ${q.label}`; continue }
    if (q.type === 'SHORT') out[q.id] = String(v).trim().slice(0, 500)
    else if (q.type === 'LONG') out[q.id] = String(v).trim().slice(0, 5000)
    else if (q.type === 'RATING') {
      const n = Number(v)
      if (!Number.isInteger(n) || n < 1 || n > 5) return `Pick a rating from 1 to 5: ${q.label}`
      out[q.id] = n
    } else if (q.type === 'CHECKBOX') {
      const arr = Array.isArray(v) ? v.map(String) : [String(v)]
      if (arr.some((a) => !q.options!.includes(a))) return `Invalid choice: ${q.label}`
      out[q.id] = Array.from(new Set(arr))
    } else {
      const s = String(v)
      if (!q.options!.includes(s)) return `Invalid choice: ${q.label}`
      out[q.id] = s
    }
  }
  return out
}

export const answerText = (a: string | string[] | number | undefined) => (a === undefined ? '' : Array.isArray(a) ? a.join(', ') : String(a))
