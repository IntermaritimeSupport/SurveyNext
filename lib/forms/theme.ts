// Per-form branding, merged over the organization defaults stored in SystemSetting.
export interface FormTheme {
  logoUrl?: string
  primaryColor?: string
  thankYouMessage?: string
}

export const FORM_DEFAULTS_KEY = 'formDefaults'

const HEX = /^#[0-9a-f]{6}$/i

/** Only http(s) URLs or same-site paths: never javascript: or data: URLs. */
export function isSafeUrl(url: string): boolean {
  if (url.startsWith('/') && !url.startsWith('//')) return true
  try {
    const u = new URL(url)
    return u.protocol === 'https:' || u.protocol === 'http:'
  } catch {
    return false
  }
}

/** Keeps only known, well-formed fields (used when saving and when reading). */
export function sanitizeTheme(raw: unknown): FormTheme {
  const t: any = raw && typeof raw === 'object' ? raw : {}
  const out: FormTheme = {}
  if (typeof t.logoUrl === 'string' && t.logoUrl.trim() && isSafeUrl(t.logoUrl.trim())) out.logoUrl = t.logoUrl.trim()
  if (typeof t.primaryColor === 'string' && HEX.test(t.primaryColor.trim())) out.primaryColor = t.primaryColor.trim()
  if (typeof t.thankYouMessage === 'string' && t.thankYouMessage.trim()) out.thankYouMessage = t.thankYouMessage.trim().slice(0, 1000)
  return out
}

export function resolveTheme(formTheme: unknown, defaults: unknown): FormTheme {
  return { ...sanitizeTheme(defaults), ...sanitizeTheme(formTheme) }
}
