import { Resend } from 'resend'

// Resend is optional in dev. When no key is configured we log the email
// payload so every flow (verification, notifications, approvals) still
// completes end-to-end.
const apiKey = process.env.RESEND_API_KEY?.trim()
const fromEmail = process.env.RESEND_FROM_EMAIL || 'NEXORALABS <no-reply@nexoralabs.com>'
export const baseUrl = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000'

export const resend = apiKey ? new Resend(apiKey) : null

export interface SendArgs {
  to: string | string[]
  subject: string
  html: string
  text?: string
}

export async function sendEmail({ to, subject, html, text }: SendArgs) {
  const recipients = Array.isArray(to) ? to : [to]
  if (!resend) {
    // Dev fallback — surface in server logs so flows complete without SMTP
    console.log('\n[EMAIL:DEV-FALLOFF] ────────────────────────────')
    console.log('To:', recipients.join(', '))
    console.log('Subject:', subject)
    console.log('Body:', text || html.slice(0, 800))
    console.log('──────────────────────────────────────────────\n')
    return { id: 'dev-fallback', dev: true }
  }
  const { data, error } = await resend.emails.send({
    from: fromEmail,
    to: recipients,
    subject,
    html,
    text,
  })
  if (error) {
    console.error('[EMAIL:ERROR]', error)
    return { id: null, error: error.message }
  }
  return { id: data?.id }
}

// ── Brand email shell ──────────────────────────────────────
export function emailShell(opts: { preheader?: string; title: string; bodyHtml: string; cta?: { label: string; href: string } }) {
  const cta = opts.cta
    ? `<a href="${opts.cta.href}" style="display:inline-block;background:#0f766e;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;margin-top:18px;">${opts.cta.label}</a>`
    : ''
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${opts.title}</title></head>
<body style="margin:0;background:#f1f5f9;font-family:Inter,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#0f172a;">
  ${opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : ''}
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(2,6,23,0.06);">
        <tr><td style="background:linear-gradient(135deg,#0f766e 0%,#14b8a6 100%);padding:28px 40px;">
          <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;color:#ffffff;">NEXORA<span style="color:#bef264;">LABS</span></div>
          <div style="font-size:12px;color:#ccfbf1;margin-top:4px;letter-spacing:0.18em;text-transform:uppercase;">Ideas → Sustainable Solutions</div>
        </td></tr>
        <tr><td style="padding:36px 40px 8px;font-size:20px;font-weight:700;">${opts.title}</td></tr>
        <tr><td style="padding:0 40px 40px;font-size:15px;line-height:1.65;color:#334155;">
          ${opts.bodyHtml}
          ${cta}
        </td></tr>
        <tr><td style="padding:24px 40px;background:#f8fafc;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;line-height:1.6;">
          You received this email because of activity on your NEXORALABS account. If this wasn't you, please contact your administrator immediately.<br/>
          © ${new Date().getFullYear()} NEXORALABS. In partnership with the UN Sustainable Development Goals.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`
}

export function linkButton(href: string, label: string) {
  return `<a href="${href}" style="display:inline-block;background:#0f766e;color:#ffffff;font-weight:600;text-decoration:none;padding:12px 24px;border-radius:10px;">${label}</a>`
}
