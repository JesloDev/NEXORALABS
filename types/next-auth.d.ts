import 'next-auth'
import 'next-auth/jwt'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: 'SUPER_ADMIN' | 'ADMIN' | 'EMPLOYEE'
      status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED'
      image?: string | null
    }
  }
  interface User {
    id: string
    role?: string
    status?: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    role?: string
    status?: string
    refreshAt?: number
  }
}
