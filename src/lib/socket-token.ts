import { createHmac } from 'crypto'

const SECRET = process.env.SOCKET_SECRET || process.env.NEXTAUTH_SECRET || 'dev-secret'

export interface SocketTokenPayload {
  userId: string
  email: string
  name: string
  role: string
}

export function mintSocketToken(payload: SocketTokenPayload): string {
  const exp = Date.now() + 1000 * 60 * 60 * 12 // 12h
  const body = { ...payload, exp }
  const data = Buffer.from(JSON.stringify(body)).toString('base64url')
  const sig = createHmac('sha256', SECRET).update(data).digest('hex')
  return `${data}.${sig}`
}

export function verifySocketToken(token: string): (SocketTokenPayload & { exp: number }) | null {
  if (!token || !token.includes('.')) return null
  const [data, sig] = token.split('.')
  const expected = createHmac('sha256', SECRET).update(data).digest('hex')
  if (sig !== expected) return null
  try {
    const body = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'))
    if (!body.exp || body.exp < Date.now()) return null
    return body
  } catch {
    return null
  }
}
