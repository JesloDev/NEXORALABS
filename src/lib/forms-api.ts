import { baseUrl } from '@/lib/email'
import { parseQuestions } from '@/lib/forms'

export const formShape = (f: any) => ({
  id: f.id, title: f.title, description: f.description, open: f.open, token: f.token, url: `${baseUrl}/f/${f.token}`,
  questionCount: parseQuestions(f.questions).length, responseCount: f._count?.responses ?? 0, createdAt: f.createdAt, updatedAt: f.updatedAt,
})
