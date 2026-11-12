'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'

export interface ChatMessage {
  id: string
  chatId: string
  senderId: string
  sender: { id: string; name: string; email: string; image?: string | null }
  content: string
  createdAt: string
  editedAt?: string | null
  parentId?: string | null
  replyCount: number
  reactions: { emoji: string; userId: string }[]
}

export interface TypingEvent { chatId: string; userId: string; name: string; isTyping: boolean }
type Ack = { ok: boolean; error?: string; message?: ChatMessage }

// Where the chat service lives:
//  1. NEXT_PUBLIC_CHAT_URL (set on Vercel to the hosted chat service URL; inlined at build time).
//  2. Production host without it → same origin, which fails and surfaces the banner (misconfiguration).
//  3. Local/sandbox gateway default.
function resolveChatUrl(): string {
  const url = process.env.NEXT_PUBLIC_CHAT_URL
  if (url) return url
  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host && host !== 'localhost' && host !== '127.0.0.1') return '/'
  }
  return '/?XTransformPort=3003'
}

// One socket per session. Messages for every joined room land in a single list; the shell slices
// by chatId / parentId. Server-side access rules (access-core) decide who may join or post.
export function useChatSocket(token: string | null) {
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [chatUrl, setChatUrl] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [typing, setTyping] = useState<Record<string, { name: string; userId: string } | null>>({})
  const [online, setOnline] = useState<Set<string>>(new Set())
  const socketRef = useRef<Socket | null>(null)
  const activeChatRef = useRef<string | null>(null)

  useEffect(() => {
    if (!token) return
    const url = resolveChatUrl()
    setChatUrl(url)
    // Polling first: works through any CDN/proxy; socket.io upgrades to WebSocket when it can.
    const socket = io(url, {
      transports: ['polling', 'websocket'], auth: { token }, forceNew: true,
      reconnection: true, reconnectionAttempts: 10, reconnectionDelay: 1500, reconnectionDelayMax: 10000, timeout: 15000,
    })
    socketRef.current = socket
    const bump = () => window.dispatchEvent(new CustomEvent('nexora:chat-list-update'))

    socket.on('connect', () => { setConnected(true); setConnectionError(null) })
    socket.on('connect_error', (err: Error) => setConnectionError(err?.message || 'Cannot reach the chat service.'))
    socket.on('disconnect', () => setConnected(false))
    socket.on('ready', ({ online: ids }: { online?: string[] }) => setOnline(new Set(ids || [])))
    socket.on('presence', ({ userId, online: on }: { userId: string; online: boolean }) =>
      setOnline((prev) => { const n = new Set(prev); on ? n.add(userId) : n.delete(userId); return n }))

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]))
      if (msg.chatId === activeChatRef.current) socket.emit('chat:read', { chatId: msg.chatId })
      else bump()
    })
    socket.on('message:updated', (msg: ChatMessage) => setMessages((prev) => prev.map((m) => (m.id === msg.id ? msg : m))))
    socket.on('message:deleted', ({ messageId }: { messageId: string }) => setMessages((prev) => prev.filter((m) => m.id !== messageId && m.parentId !== messageId)))
    socket.on('typing', (e: TypingEvent) => setTyping((prev) => ({ ...prev, [e.chatId]: e.isTyping ? { name: e.name, userId: e.userId } : null })))
    socket.on('chat:list-update', bump)
    socket.on('notification:new', () => window.dispatchEvent(new CustomEvent('nexora:notification')))

    return () => { socket.disconnect(); socketRef.current = null }
  }, [token])

  const emit = useCallback((event: string, payload: unknown) => new Promise<Ack>((resolve) => {
    const s = socketRef.current
    if (!s || !s.connected) return resolve({ ok: false, error: 'Not connected' })
    s.emit(event, payload, (res: Ack) => resolve(res || { ok: false, error: 'No response' }))
  }), [])

  // Replace what we hold for a chat with a fresh REST page (keeps replies already loaded for it).
  const setChatMessages = useCallback((chatId: string, msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const fresh = new Set(msgs.map((m) => m.id))
      return [...prev.filter((m) => m.chatId !== chatId || m.parentId || fresh.has(m.id)).filter((m) => !fresh.has(m.id)), ...msgs]
    })
  }, [])
  const addMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const byId = new Map(prev.map((m) => [m.id, m]))
      msgs.forEach((m) => byId.set(m.id, m))
      return [...byId.values()]
    })
  }, [])

  const setActiveChat = useCallback((id: string | null) => {
    activeChatRef.current = id
    if (id) socketRef.current?.emit('chat:read', { chatId: id })
  }, [])

  return {
    connected, connectionError, chatUrl, messages, typing, online,
    setChatMessages, addMessages, setActiveChat,
    send: (chatId: string, content: string, parentId?: string | null) => emit('message:send', { chatId, content, parentId }),
    edit: (messageId: string, content: string) => emit('message:edit', { messageId, content }),
    react: (messageId: string, emoji: string) => emit('message:react', { messageId, emoji }),
    remove: (messageId: string) => emit('message:delete', { messageId }),
    sendTyping: (chatId: string, isTyping: boolean) => socketRef.current?.emit('typing', { chatId, isTyping }),
    markRead: (chatId: string) => socketRef.current?.emit('chat:read', { chatId }),
    joinChat: (chatId: string) => socketRef.current?.emit('chat:join', { chatId }),
    notifyUserRefresh: (userId: string) => socketRef.current?.emit('chat:refresh-user', { userId }),
  }
}
