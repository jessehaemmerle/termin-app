import nodemailer, { type Transporter } from 'nodemailer'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { env } from '../env'
import { decryptOrNull, randomToken } from '../crypto'
import type { Tenant } from '@/generated/prisma/client'

export type MailMessage = {
  to: string
  subject: string
  text: string
  html: string
  replyTo?: string
}

type SenderTenant = Pick<Tenant, 'name' | 'email' | 'smtpHost' | 'smtpPort' | 'smtpSecure' | 'smtpUser' | 'smtpPasswordEnc' | 'smtpFromEmail' | 'smtpFromName'>

const transports = new Map<string, Transporter>()

function platformTransport(): Transporter | null {
  const e = env()
  if (!e.SMTP_HOST) return null
  const key = 'platform'
  if (!transports.has(key)) {
    transports.set(
      key,
      nodemailer.createTransport({
        host: e.SMTP_HOST,
        port: e.SMTP_PORT,
        secure: e.SMTP_SECURE,
        auth: e.SMTP_USER ? { user: e.SMTP_USER, pass: e.SMTP_PASSWORD } : undefined,
        requireTLS: !e.SMTP_SECURE,
      }),
    )
  }
  return transports.get(key)!
}

export function tenantTransport(tenant: SenderTenant): Transporter | null {
  if (!tenant.smtpHost) return null
  const password = decryptOrNull(tenant.smtpPasswordEnc)
  return nodemailer.createTransport({
    host: tenant.smtpHost,
    port: tenant.smtpPort ?? 587,
    secure: tenant.smtpSecure,
    auth: tenant.smtpUser ? { user: tenant.smtpUser, pass: password ?? '' } : undefined,
    requireTLS: !tenant.smtpSecure,
  })
}

/** Entwicklung ohne SMTP: E-Mails landen als JSON in .mail/ (nie in Produktion). */
async function writeDevMail(from: string, message: MailMessage) {
  const dir = path.join(process.cwd(), '.mail')
  await mkdir(dir, { recursive: true })
  const file = path.join(dir, `${Date.now()}-${randomToken(4)}.json`)
  await writeFile(file, JSON.stringify({ from, ...message, sentAt: new Date().toISOString() }, null, 2))
  return `dev:${path.basename(file)}`
}

export class MailNotConfiguredError extends Error {}

/**
 * Versendet eine E-Mail im Namen eines Betriebs (eigenes SMTP, sonst Plattform-SMTP
 * mit dem Betriebsnamen als Absendername und der Betriebsadresse als Antwortadresse).
 */
export async function sendMail(message: MailMessage, tenant?: SenderTenant | null): Promise<string> {
  const e = env()
  const own = tenant ? tenantTransport(tenant) : null
  if (own && tenant) {
    const from = { name: tenant.smtpFromName || tenant.name, address: tenant.smtpFromEmail || tenant.smtpUser || e.SMTP_FROM_EMAIL }
    const info = await own.sendMail({ from, ...message })
    return info.messageId
  }
  const from = { name: tenant?.name ?? e.PLATFORM_NAME, address: e.SMTP_FROM_EMAIL }
  const replyTo = message.replyTo ?? tenant?.email ?? undefined
  const transport = platformTransport()
  if (!transport) {
    if (e.NODE_ENV === 'production') throw new MailNotConfiguredError('Kein SMTP-Server konfiguriert (SMTP_HOST).')
    return writeDevMail(`${from.name} <${from.address}>`, { ...message, replyTo })
  }
  const info = await transport.sendMail({ from, ...message, replyTo })
  return info.messageId
}

export async function verifyTenantSmtp(tenant: SenderTenant) {
  const transport = tenantTransport(tenant)
  if (!transport) throw new Error('Kein eigener SMTP-Server hinterlegt.')
  await transport.verify()
}
