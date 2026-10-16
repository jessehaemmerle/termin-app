'use server'

import { redirect } from 'next/navigation'
import { db } from '@/lib/db'
import type { ActionState } from '@/lib/actions'
import { isBookable, requireTenant } from '@/lib/tenant'
import { parsePublicContact } from '@/lib/booking/public-form'
import { BookingError, createGroupBooking, joinWaitlist } from '@/lib/booking/service'

function sessionId(formData: FormData) {
  const id = formData.get('kurs')
  return typeof id === 'string' && id.length < 40 ? id : null
}

export async function bookCourseAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  if (!(await isBookable(tenant))) return { error: 'Die Online-Buchung ist derzeit nicht verfügbar.' }
  const id = sessionId(formData)
  if (!id) return { error: 'Kurstermin nicht gefunden.' }
  const contact = await parsePublicContact(tenant, formData, 'book')
  if (!contact.ok) return contact.state

  let token: string
  try {
    const result = await createGroupBooking({
      tenant,
      sessionId: id,
      customer: contact.value.customer,
      note: contact.value.note,
      notifyWhatsapp: contact.value.notifyWhatsapp,
      source: 'ONLINE',
    })
    token = result.manageToken
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    console.error('Kursbuchung fehlgeschlagen', error)
    return { error: 'Die Buchung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.' }
  }
  redirect(`/termin/${token}?neu=1`)
}

export async function joinCourseWaitlistAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const tenant = await requireTenant()
  if (!tenant.waitlistEnabled) return { error: 'Die Warteliste ist nicht aktiviert.' }
  const id = sessionId(formData)
  const session = id ? await db.groupSession.findFirst({ where: { id, tenantId: tenant.id, cancelledAt: null } }) : null
  if (!session) return { error: 'Kurstermin nicht gefunden.' }
  const contact = await parsePublicContact(tenant, formData, 'waitlist')
  if (!contact.ok) return contact.state

  let token: string
  try {
    token = await joinWaitlist({
      tenant,
      serviceId: session.serviceId,
      groupSessionId: session.id,
      customer: contact.value.customer,
      notifyWhatsapp: contact.value.notifyWhatsapp,
    })
  } catch (error) {
    if (error instanceof BookingError) return { error: error.message }
    throw error
  }
  redirect(`/warteliste/${token}?neu=1`)
}
