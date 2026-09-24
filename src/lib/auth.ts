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
    }).catch(() => {}),
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
    }).catch(() => {}),
  ])
}

export const authOptions: NextAuthOptions = {
  // JWT strategy with a very long maxAge so sessions persist until the user
  // explicitly signs out. 365 days — effectively "no timeout". The token also
  // uses updateAge so role/status changes are picked up without re-login.
  session: {
    strategy: 'jwt',
    maxAge: 365 * 24 * 60 * 60, // 1 year — session never times out on its own
    updateAge: 24 * 60 * 60, // refresh the JWT (re-fetch role/status) at most once/day
  },
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

        // Defensive: if the DB is unreachable, throw a clear error instead of
        // letting Prisma's unhandled rejection crash the endpoint with a 500.
        let user
        try {
          user = await db.user.findUnique({ where: { email } })
        } catch (dbErr) {
          console.error('[auth] DB error during sign in:', dbErr)
          throw new Error('Sign in is temporarily unavailable. Please try again in a moment.')
        }
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

        // Record the login (non-fatal if this fails)
        try {
          await db.user.update({
            where: { id: user.id },
            data: { lastLoginAt: new Date() },
          })
          await logActivity({ userId: user.id, action: 'login', details: { email } })
        } catch (e) {
          console.error('[auth] non-fatal: could not record login:', e)
        }

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
      // On initial sign-in, persist the user's role/status in the token.
      if (user) {
        token.id = (user as any).id
        token.role = (user as any).role
        token.status = (user as any).status
        return token
      }
      // On subsequent calls (session refresh), ONLY re-fetch role/status if
      // the token is due for a refresh (controlled by session.updateAge).
      // This avoids a DB query on EVERY page load — the #1 cause of intermittent
      // 401s when the DB has a momentary connection blip. If the DB is down, we
      // keep the existing token values (graceful degradation) instead of throwing.
      if (token.id && token.refreshAt && Date.now() < token.refreshAt) {
        return token // not due for refresh — use cached values
      }
      if (token.id) {
        try {
          const fresh = await db.user.findUnique({
            where: { id: token.id as string },
            select: { role: true, status: true, name: true },
          })
          if (fresh) {
            token.role = fresh.role
            token.status = fresh.status
            token.name = fresh.name
          }
          // Schedule next refresh (24h). If the user's status changes (e.g.
          // suspended by an admin), it takes up to 24h to propagate — but the
          // session never throws, so the user is never randomly logged out.
          token.refreshAt = Date.now() + 24 * 60 * 60 * 1000
        } catch {
          // DB unreachable — keep existing token. The session stays valid.
          // This is the key fix for intermittent sign-in failures.
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
      // login notifications handled in authorize
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  // Required for NextAuth v4 on Vercel/production — uses the forwarded host
  trustHost: true,
}

// Helpful startup guard: if the secret is missing in production, log a clear
// message so it's obvious what env var needs to be set on Vercel.
if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
  console.error('[NEXORALABS] FATAL: NEXTAUTH_SECRET is not set. Add it to your Vercel environment variables. Generate one with: openssl rand -base64 32')
}
