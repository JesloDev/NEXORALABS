export interface SpaceSummary {
  id: string; name: string; slug: string; description?: string | null; icon?: string | null; color?: string | null
  visibility: 'PUBLIC' | 'PRIVATE'; archived: boolean
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | null
  isMember: boolean; viaAdmin: boolean
  memberCount: number; pageCount: number; channelCount: number; unread: number
}
export interface ChannelSummary {
  id: string; name: string; topic?: string | null; description?: string | null
  isPrivate: boolean; isMember: boolean; memberCount: number; unread: number
}
export interface PageNode { id: string; parentId: string | null; title: string; icon?: string | null; position: number; updatedAt: string }
export interface SpaceMemberRow {
  id: string; name: string; email: string; image?: string | null; title?: string | null
  spaceRole: 'OWNER' | 'ADMIN' | 'MEMBER'; orgRole: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
}
export interface SpaceDetail {
  space: { id: string; name: string; slug: string; description?: string | null; icon?: string | null; color?: string | null; visibility: 'PUBLIC' | 'PRIVATE'; archived: boolean }
  access: { role: SpaceSummary['role']; isMember: boolean; viaAdmin: boolean; canJoin: boolean; canManage: boolean; canViewContent: boolean }
  channels: ChannelSummary[]
  pages: PageNode[]
  members: SpaceMemberRow[]
}

export type Main =
  | { kind: 'chat'; id: string }
  | { kind: 'page'; id: string }
  | { kind: 'space-home' }
  | { kind: 'all-spaces' }
  | { kind: 'console' }
  | { kind: 'notifications' }
  | { kind: 'profile' }
  | { kind: 'empty' }

export function initials(name?: string | null) {
  return (name || '?').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '?'
}

export const SPACE_COLORS = ['#166534', '#65a30d', '#15803d', '#a16207', '#7c3aed', '#be123c', '#1d4ed8', '#334155']

export async function api<T = any>(url: string, init?: RequestInit & { json?: unknown }): Promise<{ ok: boolean; data: T; error?: string }> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: init?.json !== undefined ? { 'Content-Type': 'application/json', ...(init.headers || {}) } : init?.headers,
      body: init?.json !== undefined ? JSON.stringify(init.json) : init?.body,
    })
    const data = await res.json().catch(() => ({}))
    return { ok: res.ok, data, error: res.ok ? undefined : data?.error || 'Request failed.' }
  } catch {
    return { ok: false, data: {} as T, error: 'Network error.' }
  }
}
