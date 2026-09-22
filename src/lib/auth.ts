import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/password'
import { logActivity } from '@/lib/activity'
import { sendEmail, emailShell, baseUrl } from '@/lib/email'

async function sendLoginNotification(userId: string, email: string, name: string) {
  const now = new Date().toLocaleString('en-US', { timeZone: 'UTC' })
  await Promise.all([
    db.notification.create({
      data: {
        userId,
        type: 'LOGIN',
        title: 'New sign-in to your account',
        body: `A sign-in to your NEXORALABS account occurred on ${now}. If this was you, no action is needed.`,
      },
    }),
    sendEmail({
      to: email,
      subject: 'New sign-in to your NEXORALABS account',
      html: emailShell({
        title: 'New sign-in detected',
        preheader: 'A new sign-in to your NEXORALABS account occurred.',
        bodyHtml: `<p>Hi ${name || 'there'},</p>
          <p>A new sign-in to your NEXORALABS account just occurred:</p>
          <p style="background:#f8fafc;border-left:3px solid #0f766e;padding:12px 16px;border-radius:8px;margin:16px 0;">
            <strong>Date (UTC):</strong> ${now}<br/>
            <strong>Account:</strong> ${email}
          </p>
          <p>If this was you, there is nothing you need to do. If you do not recognize this activity, please change your password immediately and contact an administrator.</p>`,
      }),
      text: `New sign-in to your NEXORALABS account on ${now}. If this wasn't you, secure your account.`,
    }),
  ])
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt', maxAge: 60 * 60 * 24 * 7 },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/signin',
  },
  providers: [
    CredentialsProvider({
      name: 'NEXORALABS',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const email = credentials?.email?.trim().toLowerCase()
        const password = credentials?.password
        if (!email || !password) return null

        const user = await db.user.findUnique({ where: { email } })
        if (!user || !user.password) return null

        // Block unverified / suspended / pending accounts from signing in.
        if (!user.emailVerified) {
          throw new Error('Please verify your email address before signing in.')
        }
        if (user.status === 'SUSPENDED') {
          throw new Error('Your account has been suspended. Contact an administrator.')
        }
        if (user.status === 'PENDING') {
          throw new Error('Your registration is pending administrator approval.')
        }
        if (user.status === 'REJECTED') {
          throw new Error('Your registration was not approved. Please contact an administrator.')
        }

        const ok = await verifyPassword(password, user.password)
        if (!ok) return null

        await db.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
        await logActivity({ userId: user.id, action: 'login', details: { email } })

        // Fire-and-forget login notification email + in-app notification
        sendLoginNotification(user.id, user.email, user.name).catch(() => {})

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.status = (user as any).status
      }
      // Keep token fresh with DB state
      if (token.id) {
        const fresh = await db.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, status: true, name: true },
        })
        if (fresh) {
          token.role = fresh.role
          token.status = fresh.status
          token.name = fresh.name
        }
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        ;(session.user as any).id = token.id
        ;(session.user as any).role = token.role
        ;(session.user as any).status = token.status
      }
      return session
    },
  },
  events: {
    async signIn(message) {
      // login notifications handled in authorize via activity log; email sent separately by caller if needed
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}
