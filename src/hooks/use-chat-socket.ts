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

export function useChatSocket(token: string | null) {
  const [connected, setConnected] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [typing, setTyping] = useState<Record<string, { name: string; userId: string } | null>>({})
  const socketRef = useRef<Socket | null>(null)
  const activeChatRef = useRef<string | null>(null)

  useEffect(() => { activeChatRef.current = activeChatId }, [activeChatId])

  useEffect(() => {
    if (!token) return
    const socket = io('/?XTransformPort=3003', {
      transports: ['websocket', 'polling'],
      auth: { token },
      forceNew: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1500,
      timeout: 10000,
    })
    socketRef.current = socket

    socket.on('connect', () => setConnected(true))
    socket.on('disconnect', () => setConnected(false))

    socket.on('message:new', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
      // mark read immediately if it's the active chat (so unread resets)
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
      // Tell the parent to refetch chat list
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
