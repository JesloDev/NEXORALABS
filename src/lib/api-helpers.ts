import { NextResponse } from 'next/server'

export function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status })
}

export function unauthorized(message = 'Unauthorized') {
  return NextResponse.json({ error: message }, { status: 401 })
}

export function forbidden(message = 'Forbidden') {
  return NextResponse.json({ error: message }, { status: 403 })
}

export function badRequest(message = 'Bad request') {
  return NextResponse.json({ error: message }, { status: 400 })
}

export function notFound(message = 'Not found') {
  return NextResponse.json({ error: message }, { status: 404 })
}

export function getClientInfo(req: Request) {
  const forwarded = req.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || req.headers.get('x-real-ip') || null
  const userAgent = req.headers.get('user-agent') || null
  return { ip, userAgent }
}

// Centralized validation token generator (crypto random, url-safe)
import { randomBytes } from 'crypto'
export function genToken(bytes = 32) {
  return randomBytes(bytes).toString('hex')
}
