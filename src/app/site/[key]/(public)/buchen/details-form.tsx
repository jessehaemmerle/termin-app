'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { Checkbox } from '@/components/ui'
import type { ActionState } from '@/lib/actions'
import { HEALTH_DATA_HINT, whatsappConsentText } from '@/lib/legal/consent'

type Props = {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>
  hidden: Record<string, string>
  tenantName: string
  whatsappEnabled: boolean
  requirePhone: boolean
  requireApproval?: boolean
  cancellationDeadlineHours?: number
  customer: { name: string; email: string; phone: string } | null
  accountsEnabled: boolean
  submitLabel: string
  showNote?: boolean
}

export function BookingDetailsForm(props: Props) {
  const [whatsapp, setWhatsapp] = useState(false)
  const [renderedAt] = useState(() => Date.now())
  const phoneRequired = props.requirePhone || whatsapp
  const showNote = props.showNote ?? true

  return (
    <ActionForm action={props.action}>
      {Object.entries(props.hidden).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <input type="hidden" name="t" value={renderedAt} />

      {!props.customer && props.accountsEnabled && (
        <p className="text-sm text-graphite">
          Sie haben ein Kundenkonto? <Link href="/konto/anmelden">Anmelden</Link> und Ihre Daten werden übernommen.
        </p>
      )}

      <div className="space-y-1.5">
        <label htmlFor="name" className="block font-semibold">Name</label>
        <input
          id="name"
          name="name"
          className="field-control"
          autoComplete="name"
          required
          maxLength={100}
          defaultValue={props.customer?.name}
          readOnly={!!props.customer}
          aria-describedby="name-error"
        />
        <FieldError name="name" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="email" className="block font-semibold">E-Mail-Adresse</label>
        <input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          className="field-control"
          autoComplete="email"
          required
          maxLength={200}
          defaultValue={props.customer?.email}
          readOnly={!!props.customer}
          aria-describedby="email-hint email-error"
        />
        <p id="email-hint" className="text-sm text-graphite">Für die Bestätigung und den Link zum Absagen.</p>
        <FieldError name="email" />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="telefon" className="block font-semibold">
          Mobilnummer{!phoneRequired && <span className="font-normal text-graphite"> (optional)</span>}
        </label>
        <input
          id="telefon"
          name="telefon"
          type="tel"
          inputMode="tel"
          className="field-control"
          autoComplete="tel"
          required={phoneRequired}
          maxLength={30}
          defaultValue={props.customer?.phone}
          placeholder="+43 664 1234567"
          aria-describedby="telefon-hint telefon-error"
        />
        <p id="telefon-hint" className="text-sm text-graphite">Nur für Rückfragen zu Ihrem Termin.</p>
        <FieldError name="telefon" />
      </div>

      {showNote && (
        <div className="space-y-1.5">
          <label htmlFor="notiz" className="block font-semibold">
            Nachricht an uns <span className="font-normal text-graphite">(optional)</span>
          </label>
          <textarea id="notiz" name="notiz" className="field-control" maxLength={500} rows={3} aria-describedby="notiz-hint notiz-error" />
          <p id="notiz-hint" className="text-sm text-graphite">{HEALTH_DATA_HINT}</p>
          <FieldError name="notiz" />
        </div>
      )}

      {props.whatsappEnabled && (
        <fieldset className="border border-rule rounded-[var(--radius-control)] p-4 bg-surface">
          <legend className="px-1 font-semibold">Benachrichtigung per WhatsApp</legend>
          <Checkbox
            id="whatsapp"
            name="whatsapp"
            label="Ja, ich möchte Bestätigung und Erinnerung auch per WhatsApp erhalten."
            hint={whatsappConsentText(props.tenantName)}
            checked={whatsapp}
            onChange={(e) => setWhatsapp(e.currentTarget.checked)}
          />
          <p className="text-sm text-graphite mt-2">Ohne Häkchen erhalten Sie alle Nachrichten nur per E-Mail.</p>
        </fieldset>
      )}

      {/* Honeypot gegen automatisierte Anfragen – für Menschen unsichtbar */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="text-sm text-graphite space-y-2">
        {props.requireApproval && <p>Ihr Termin wird nach Prüfung durch uns bestätigt. Sie erhalten dazu eine Nachricht.</p>}
        <p>
          Wir verarbeiten Ihre Angaben zur Durchführung des Termins. Details in der{' '}
          <Link href="/datenschutz" target="_blank">Datenschutzerklärung</Link>. Es gelten unsere{' '}
          <Link href="/buchungsbedingungen" target="_blank">Buchungsbedingungen</Link>
          {props.cancellationDeadlineHours !== undefined && (
            <> – kostenlos absagen können Sie online bis {props.cancellationDeadlineHours} Stunden vor dem Termin</>
          )}
          .
        </p>
      </div>

      <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-paper/95 backdrop-blur safe-bottom sm:static sm:mx-0 sm:px-0 sm:bg-transparent">
        <SubmitButton pendingLabel="Wird gesendet …" className="w-full sm:w-auto">
          {props.submitLabel}
        </SubmitButton>
      </div>
    </ActionForm>
  )
}
