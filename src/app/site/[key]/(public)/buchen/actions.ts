'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'
import type { ActionState } from '@/lib/actions'
import { isBookable, requireTenant } from '@/lib/tenant'
import { isValidDateString, timeToMinutes, zonedInstant } from '@/lib/time'
import { parsePublicContact } from '@/lib/booking/public-form'
import { BookingError, createIndividualBooking } from '@/lib/booking/service'

const slotSchema = z.object({
  leistung: z.string().min(1).max(40),
  person: z.string().min(1).max(40),
  datum: z.string().refine(isValidDateString),
  zeit: z.string().regex(/^\d{2}:\d{2}$/),
})

export async function bookAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  if (!(await isBookable(tenant))) return { error: 'Die Online-Buchung ist derzeit nicht verfügbar.' }

  const slot = slotSchema.safeParse(Object.fromEntries(formData))
  if (!slot.success) return { error: 'Der gewählte Termin ist ungültig. Bitte wählen Sie erneut.' }

  const contact = await parsePublicContact(tenant, formData, 'book')
  if (!contact.ok) return contact.state

  const minute = timeToMinutes(slot.data.zeit)
  if (minute === null) return { error: 'Ungültige Uhrzeit.' }

  let token: string
  try {
    const result = await createIndividualBooking({
      tenant,
      serviceId: slot.data.leistung,
      staffId: slot.data.person,
      start: zonedInstant(slot.data.datum, minute, tenant.timezone),
      customer: contact.value.customer,
      note: contact.value.note,
      notifyWhatsapp: contact.value.notifyWhatsapp,
      source: 'ONLINE',
    })
    token = result.manageToken
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    console.error('Buchung fehlgeschlagen', error)
    return { error: 'Die Buchung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' }
  }
  redirect(`/termin/${token}?neu=1`)
}
