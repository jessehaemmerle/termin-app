'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { sha256 } from '@/lib/crypto'
import type { ActionState } from '@/lib/actions'
import { requireTenant } from '@/lib/tenant'
import { isValidDateString } from '@/lib/time'
import { parsePublicContact } from '@/lib/booking/public-form'
import { BookingError, joinWaitlist } from '@/lib/booking/service'

const schema = z.object({
  leistung: z.string().min(1).max(40),
  datum: z.string().refine(isValidDateString),
  person: z.string().max(40).optional(),
})

export async function joinDayWaitlistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  if (!tenant.waitlistEnabled) return { error: 'Die Warteliste ist nicht aktiviert.' }
  const parsed = schema.safeParse({
    leistung: formData.get('leistung'),
    datum: formData.get('datum'),
    person: formData.get('person') ?? undefined,
  })
  if (!parsed.success) return { error: 'Ungültige Angaben.' }
  const contact = await parsePublicContact(tenant, formData, 'waitlist')
  if (!contact.ok) return contact.state

  let staffId: string | null = null
  if (parsed.data.person) {
    const staff = await db.staff.findFirst({ where: { id: parsed.data.person, tenantId: tenant.id } })
    staffId = staff?.id ?? null
  }

  let token: string
  try {
    token = await joinWaitlist({
      tenant,
      serviceId: parsed.data.leistung,
      date: parsed.data.datum,
      staffId,
      customer: contact.value.customer,
      notifyWhatsapp: contact.value.notifyWhatsapp,
    })
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  redirect(`/warteliste/${token}?neu=1`)
}

export async function leaveWaitlistAction(token: string, _prev: ActionState): Promise<ActionState> {
  const tenant = await requireTenant()
  if (!/^[A-Za-z0-9_-]{20,100}$/.test(token)) return { error: 'Eintrag nicht gefunden.' }
  const deleted = await db.waitlistEntry.deleteMany({ where: { tenantId: tenant.id, tokenHash: sha256(token) } })
  if (!deleted.count) return { error: 'Eintrag nicht gefunden oder bereits gelöscht.' }
  redirect('/warteliste/entfernt')
}
