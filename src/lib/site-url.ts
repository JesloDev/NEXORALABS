// The public address of the site, used for every link that is copied, shared or emailed.
// Never a *.vercel.app address: those are deployment URLs, not the real domain.
export const PRODUCTION_SITE_URL = 'https://www.nxrlabz.com.ng'

const isDeployHost = (u: string) => /(^|\.)vercel\.app(\/|:|$)/i.test(u.replace(/^https?:\/\//i, ''))
const clean = (u: string) => u.trim().replace(/\/+$/, '')

// Server side: first configured URL that is not a vercel.app one, else the real domain.
export function siteUrl(): string {
  for (const v of [process.env.APP_BASE_URL, process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXTAUTH_URL]) {
    if (v && !isDeployHost(v)) return clean(v)
  }
  return process.env.NODE_ENV === 'production' ? PRODUCTION_SITE_URL : 'http://localhost:3000'
}

// Browser side: the address the person sees, unless it is a vercel.app / preview address.
export function browserOrigin(): string {
  const o = window.location.origin
  return isDeployHost(o) ? PRODUCTION_SITE_URL : o
}
