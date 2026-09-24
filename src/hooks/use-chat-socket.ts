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
}

export interface TypingEvent {
  chatId: string
  userId: string
  name: string
  isTyping: boolean
}

// Resolve where the chat service lives.
// Priority:
//   1. NEXT_PUBLIC_CHAT_URL env var (set on Vercel to your Render chat URL).
//      Next.js inlines NEXT_PUBLIC_* at BUILD time, so this must be set before
//      the production build runs — and you must redeploy if you change it.
//   2. If running on a non-localhost host (production) and the env var wasn't
//      inlined, return '/' (same-origin). The connection will fail and the
//      banner will tell the user the chat service is unreachable. We do NOT
//      use the sandbox ?XTransformPort hack on production — there's no gateway.
//   3. Sandbox default: same origin via the Caddy gateway query param.
function resolveChatUrl(): string {
  const chatUrl = process.env.NEXT_PUBLIC_CHAT_URL
  if (chatUrl) return chatUrl

  if (typeof window !== 'undefined') {
    const host = window.location.hostname
    if (host && host !== 'localhost' && host !== '127.0.0.1') {
      // Production without NEXT_PUBLIC_CHAT_URL — misconfiguration.
      return '/'
    }
  }
  return '/?XTransformPort=3003'
}

export function useChatSocket(token: string | null) {
  const [connected, setConnected] = useState(false)
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [chatUrl, setChatUrl] = useState<string>('')
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [typing, setTyping] = useState<Record<string, { name: string; userId: string } | null>>({})
  const socketRef = useRef<Socket | null>(null)
  const activeChatRef = useRef<string | null>(null)

  useEffect(() => { activeChatRef.current = activeChatId }, [activeChatId])

  useEffect(() => {
    if (!token) return
    const url = resolveChatUrl()
    setChatUrl(url)
    // Polling-first: works through any CDN/proxy (Vercel, Render). Socket.io
    // auto-upgrades to WebSocket once the handshake succeeds. This avoids
    // "WebSocket connection failed" errors when wss is blocked by the host.
    const socket = io(url, {
      transports: ['polling', 'websocket'],
      auth: { token },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      reconnectionDelayMax: 10000,
      timeout: 15000,
    })
    socketRef.current = socket

    socket.on('connect', () => { setConnected(true); setConnectionError(null) })
    socket.on('disconnect', () => setConnected(false))
    socket.on('connect_error', (err: any) => {
      setConnectionError(err?.message || 'Cannot reach the chat service.')
    })

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      if (msg.chatId === activeChatRef.current) {
        socket.emit('chat:read', { chatId: msg.chatId })
      }
    })

    socket.on('message:deleted', ({ messageId }: { messageId: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== messageId))
    })

    socket.on('typing', (e: TypingEvent) => {
      setTyping((prev) => ({ ...prev, [e.chatId]: e.isTyping ? { name: e.name, userId: e.userId } : null }))
    })

    socket.on('chat:list-update', () => {
      window.dispatchEvent(new CustomEvent('nexora:chat-list-update'))
    })

    return () => {
      socket.disconnect()
      socketRef.current = null
    }
  }, [token])

  const setMessagesBulk = useCallback((msgs: ChatMessage[]) => setMessages(msgs), [])
  const appendMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages((prev) => {
      const ids = new Set(prev.map((m) => m.id))
      const merged = [...prev, ...msgs.filter((m) => !ids.has(m.id))]
      return merged
    })
  }, [])

  const sendMessage = useCallback((chatId: string, content: string) => {
    return new Promise<{ ok: boolean; error?: string; message?: ChatMessage }>((resolve) => {
      const socket = socketRef.current
      if (!socket || !connected) return resolve({ ok: false, error: 'Not connected' })
      socket.emit('message:send', { chatId, content }, (res: any) => resolve(res || { ok: false, error: 'No response' }))
    })
  }, [connected])

  const deleteMessage = useCallback((messageId: string) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('message:delete', { messageId })
  }, [])

  const sendTyping = useCallback((chatId: string, isTyping: boolean) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('typing', { chatId, isTyping })
  }, [])

  const markRead = useCallback((chatId: string) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('chat:read', { chatId })
  }, [])

  const joinChat = useCallback((chatId: string) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('chat:join', { chatId })
  }, [])

  const notifyUserRefresh = useCallback((userId: string) => {
    const socket = socketRef.current
    if (!socket) return
    socket.emit('chat:refresh-user', { userId })
  }, [])

  return {
    connected,
    connectionError,
    chatUrl,
    messages,
    setMessages: setMessagesBulk,
    appendMessages,
    sendMessage,
    deleteMessage,
    sendTyping,
    markRead,
    joinChat,
    notifyUserRefresh,
    typing,
    activeChatId,
    setActiveChatId,
  }
}
