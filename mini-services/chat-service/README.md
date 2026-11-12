# NEXORALABS chat service (Render)

Self-contained socket.io server. It does not import anything from outside this folder
(`access.ts` is a copy of `src/lib/access-core.ts` — keep them identical).

## Render settings
- Root Directory: `mini-services/chat-service`
- Build Command: `bun install && bunx prisma generate --schema=./prisma/schema.prisma`
- Start Command: `bun index.ts`
- Health Check Path: `/health`

## Environment variables
| Name | Notes |
|---|---|
| `DATABASE_URL` | same Aiven Postgres URL as the web app |
| `SOCKET_SECRET` | **must equal** the web app's `SOCKET_SECRET` (service exits in production if missing) |
| `CORS_ORIGINS` | optional, comma-separated site origins, e.g. `https://nexoralabs.com`; empty = allow all |
| `APP_BASE_URL` | web app URL, used in notification email links |
| `RESEND_API_KEY`, `RESEND_FROM_EMAIL` | optional; without a key emails are logged |

`PORT` is provided by Render. On Vercel set `NEXT_PUBLIC_CHAT_URL` to this service's URL and redeploy.

`prisma/schema.prisma` here is a copy of the root schema (needed so the service can generate its own client).
