import { z } from 'zod'

const bool = (fallback: boolean) =>
  z
    .string()
    .optional()
    .transform((v) => (v === undefined || v === '' ? fallback : v === 'true' || v === '1'))

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== '' ? v.trim() : undefined))

const text = (fallback = '') =>
  z
    .string()
    .optional()
    .transform((v) => (v && v.trim() !== '' ? v.trim() : fallback))

const schema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL fehlt'),
  PLATFORM_BASE_URL: z.url().default('http://localhost:3000'),
  PLATFORM_NAME: text('Termin-App'),
  /** Preisangabe auf der Plattform-Website, z. B. „29 €“ (leer: „auf Anfrage“) */
  PRICE_MONTHLY: text(),
  /** Zusatz zum Preis, z. B. „pro Monat zzgl. 20 % USt., monatlich kündbar“ */
  PRICE_NOTE: text('pro Monat zzgl. USt., monatlich kündbar'),
  SINGLE_TENANT_SLUG: optional,
  APP_ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, 'base64').length === 32, 'APP_ENCRYPTION_KEY muss 32 Byte (base64) lang sein'),
  TRUST_PROXY: bool(false),
  COOKIE_SECURE: bool(false),

  OPERATOR_NAME: text('(Betreiber nicht konfiguriert)'),
  OPERATOR_LEGAL_FORM: text(),
  OPERATOR_STREET: text(),
  OPERATOR_POSTAL_CODE: text(),
  OPERATOR_CITY: text(),
  OPERATOR_COUNTRY: text('Österreich'),
  OPERATOR_EMAIL: text(),
  OPERATOR_PHONE: text(),
  OPERATOR_UID: text(),
  OPERATOR_COMPANY_REGISTER_NUMBER: text(),
  OPERATOR_COMPANY_REGISTER_COURT: text(),
  OPERATOR_BUSINESS_PURPOSE: text(),
  OPERATOR_SUPERVISORY_AUTHORITY: text(),
  OPERATOR_CHAMBER: text(),
  OPERATOR_PRIVACY_EMAIL: text(),
  HOSTING_PROVIDER: text('(Hosting-Anbieter nicht konfiguriert)'),
  HOSTING_LOCATION: text('(Standort nicht konfiguriert)'),
  MAIL_PROVIDER: text('(E-Mail-Anbieter nicht konfiguriert)'),

  SMTP_HOST: optional,
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: bool(false),
  SMTP_USER: optional,
  SMTP_PASSWORD: optional,
  SMTP_FROM_EMAIL: text('noreply@localhost'),

  VAPID_PUBLIC_KEY: optional,
  VAPID_PRIVATE_KEY: optional,
  VAPID_SUBJECT: text('mailto:office@example.at'),

  WHATSAPP_GRAPH_VERSION: text('v23.0'),
  WHATSAPP_DRY_RUN: bool(false),
})

export type Env = z.infer<typeof schema>

let cached: Env | undefined

/** Liest und validiert die Umgebungsvariablen beim ersten Zugriff. */
export function env(): Env {
  if (!cached) {
    const parsed = schema.safeParse(process.env)
    if (!parsed.success) {
      const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('\n')
      throw new Error(`Ungültige Konfiguration:\n${issues}`)
    }
    cached = parsed.data
  }
  return cached
}

export function platformBase() {
  const url = new URL(env().PLATFORM_BASE_URL)
  return {
    protocol: url.protocol,
    hostname: url.hostname.toLowerCase(),
    port: url.port,
    origin: url.origin,
  }
}
