import { renderEmail } from './email-layout'
import { sendMail } from './mailer'
import { env } from '../env'
import type { Tenant } from '@/generated/prisma/client'

function footerFor(tenant: Tenant | null) {
  if (!tenant) return `${env().PLATFORM_NAME}\n${env().OPERATOR_NAME}`
  return [tenant.legalName || tenant.name, [tenant.street, [tenant.postalCode, tenant.city].filter(Boolean).join(' ')].filter(Boolean).join(', ')]
    .filter(Boolean)
    .join('\n')
}

export async function sendInviteEmail(tenant: Tenant, to: string, inviterName: string, url: string) {
  const mail = renderEmail(
    {
      subject: `Einladung ins Team von ${tenant.name}`,
      heading: `Willkommen im Team von ${tenant.name}`,
      blocks: [
        { type: 'p', text: `${inviterName} hat dich eingeladen, die Terminverwaltung von ${tenant.name} zu nutzen.` },
        { type: 'button', label: 'Einladung annehmen', url },
        { type: 'small', text: 'Der Link ist 72 Stunden gültig. Falls du diese Einladung nicht erwartet hast, kannst du die E-Mail ignorieren.' },
      ],
      footer: footerFor(tenant),
    },
    tenant.primaryColor,
  )
  return sendMail({ to, ...mail }, tenant)
}

export async function sendPasswordResetEmail(tenant: Tenant | null, to: string, url: string, formal = false) {
  const du = !formal
  const mail = renderEmail(
    {
      subject: 'Passwort zurücksetzen',
      heading: 'Neues Passwort festlegen',
      blocks: [
        { type: 'p', text: du ? 'Du hast angefordert, dein Passwort zurückzusetzen.' : 'Sie haben angefordert, Ihr Passwort zurückzusetzen.' },
        { type: 'button', label: 'Neues Passwort festlegen', url },
        {
          type: 'small',
          text: du
            ? 'Der Link ist eine Stunde gültig. Wenn du das nicht warst, ignoriere diese E-Mail – dein Passwort bleibt unverändert.'
            : 'Der Link ist eine Stunde gültig. Wenn Sie das nicht waren, ignorieren Sie diese E-Mail – Ihr Passwort bleibt unverändert.',
        },
      ],
      footer: footerFor(tenant),
    },
    tenant?.primaryColor ?? '#1f5f8b',
  )
  return sendMail({ to, ...mail }, tenant)
}

export async function sendVerifyEmail(tenant: Tenant, to: string, url: string) {
  const mail = renderEmail(
    {
      subject: `Bitte bestätigen Sie Ihr Kundenkonto bei ${tenant.name}`,
      heading: 'E-Mail-Adresse bestätigen',
      blocks: [
        { type: 'p', text: `Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Kundenkonto bei ${tenant.name} zu aktivieren.` },
        { type: 'button', label: 'E-Mail-Adresse bestätigen', url },
        { type: 'small', text: 'Der Link ist 48 Stunden gültig. Haben Sie kein Konto angelegt, können Sie diese E-Mail ignorieren – es wird dann kein Konto aktiviert.' },
      ],
      footer: footerFor(tenant),
    },
    tenant.primaryColor,
  )
  return sendMail({ to, ...mail }, tenant)
}

export async function sendAccountExistsEmail(tenant: Tenant, to: string, loginUrl: string, resetUrl: string) {
  const mail = renderEmail(
    {
      subject: `Ihr Kundenkonto bei ${tenant.name}`,
      heading: 'Sie haben bereits ein Kundenkonto',
      blocks: [
        { type: 'p', text: 'Jemand hat versucht, mit dieser E-Mail-Adresse ein neues Kundenkonto anzulegen. Es besteht bereits ein Konto.' },
        { type: 'button', label: 'Anmelden', url: loginUrl },
        { type: 'small', text: `Passwort vergessen? ${resetUrl}` },
      ],
      footer: footerFor(tenant),
    },
    tenant.primaryColor,
  )
  return sendMail({ to, ...mail }, tenant)
}
