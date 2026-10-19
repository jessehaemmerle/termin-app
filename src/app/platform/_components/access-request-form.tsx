'use client'

import Link from 'next/link'
import { useState } from 'react'
import { ActionForm, FieldError, SubmitButton } from '@/components/action-form'
import { submitAccessRequestAction } from '../_public-actions'

function Field({ id, label, optional, children }: { id: string; label: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-semibold">
        {label}
        {optional && <span className="font-normal text-graphite"> (optional)</span>}
      </label>
      {children}
      <FieldError name={id} />
    </div>
  )
}

export function AccessRequestForm({ privacyHref }: { privacyHref: string }) {
  const [renderedAt] = useState(() => Date.now())
  return (
    <ActionForm action={submitAccessRequestAction} resetOnSuccess className="grid gap-5 sm:grid-cols-2">
      <input type="hidden" name="t" value={renderedAt} />
      <Field id="betrieb" label="Name des Betriebs">
        <input id="betrieb" name="betrieb" required autoComplete="organization" className="field-control" />
      </Field>
      <Field id="branche" label="Branche" optional>
        <input id="branche" name="branche" placeholder="z. B. Friseur, Kosmetik, Werkstatt" className="field-control" />
      </Field>
      <Field id="name" label="Ihr Name">
        <input id="name" name="name" required autoComplete="name" className="field-control" />
      </Field>
      <Field id="email" label="E-Mail-Adresse">
        <input id="email" name="email" type="email" required autoComplete="email" className="field-control" />
      </Field>
      <Field id="telefon" label="Telefon" optional>
        <input id="telefon" name="telefon" type="tel" autoComplete="tel" className="field-control" />
      </Field>
      <Field id="team" label="Wie viele Personen nehmen Termine an?" optional>
        <select id="team" name="team" className="field-control" defaultValue="">
          <option value="">Bitte wählen</option>
          <option value="1">nur ich</option>
          <option value="2-5">2–5 Personen</option>
          <option value="6-15">6–15 Personen</option>
          <option value="16+">mehr als 15 Personen</option>
        </select>
      </Field>
      <div className="sm:col-span-2">
        <Field id="nachricht" label="Nachricht" optional>
          <textarea id="nachricht" name="nachricht" rows={4} maxLength={2000} className="field-control" placeholder="Was ist Ihnen wichtig? Gibt es schon eine Website oder eigene Domain?" />
        </Field>
      </div>

      {/* Honeypot gegen automatisierte Anfragen – für Menschen unsichtbar */}
      <div aria-hidden="true" className="absolute -left-[10000px] top-auto w-px h-px overflow-hidden">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="sm:col-span-2 space-y-4">
        <p className="text-sm text-graphite">
          Wir verwenden Ihre Angaben nur, um Ihre Anfrage zu beantworten, und löschen sie spätestens nach sechs Monaten, wenn kein Vertrag zustande kommt. Mehr dazu in der{' '}
          <Link href={privacyHref}>Datenschutzerklärung</Link>.
        </p>
        <SubmitButton pendingLabel="Wird gesendet …">Zugang anfragen</SubmitButton>
      </div>
    </ActionForm>
  )
}
