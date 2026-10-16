import { db } from '@/lib/db'
import { requireStaff } from '@/lib/auth/guards'
import { audit } from '@/lib/audit'

/** Gesamtexport aller Daten eines Betriebs (Art. 28 Abs. 3 lit. g DSGVO, Datenrückgabe). */
export async function GET() {
  const ctx = await requireStaff({ permission: 'settings.manage' })
  const tenantId = ctx.tenant.id
  const [services, staff, hours, timeOff, resources, customers, bookings, sessions, consents] = await Promise.all([
    db.service.findMany({ where: { tenantId } }),
    db.staff.findMany({ where: { tenantId }, select: { id: true, name: true, bio: true, active: true, usesTenantHours: true } }),
    db.workingHours.findMany({ where: { tenantId } }),
    db.timeOff.findMany({ where: { tenantId } }),
    db.resource.findMany({ where: { tenantId } }),
    db.customer.findMany({ where: { tenantId }, select: { id: true, name: true, email: true, phone: true, whatsappOptIn: true, internalNote: true, createdAt: true, lastActivityAt: true } }),
    db.booking.findMany({ where: { tenantId }, select: { id: true, customerId: true, serviceId: true, staffId: true, groupSessionId: true, startsAt: true, endsAt: true, status: true, source: true, customerNote: true, phone: true, createdAt: true, cancelledAt: true } }),
    db.groupSession.findMany({ where: { tenantId } }),
    db.consentRecord.findMany({ where: { tenantId } }),
  ])
  await audit({ tenantId, actorType: 'USER', actorId: ctx.user.id, action: 'customer.exported', detail: 'Gesamtexport' })
  const body = { exportiertAm: new Date().toISOString(), betrieb: { name: ctx.tenant.name, slug: ctx.tenant.slug }, leistungen: services, personen: staff, arbeitszeiten: hours, abwesenheiten: timeOff, ressourcen: resources, kunden: customers, termine: bookings, kurstermine: sessions, einwilligungen: consents }
  return new Response(JSON.stringify(body, null, 2), {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Disposition': `attachment; filename="export-${ctx.tenant.slug}.json"`, 'Cache-Control': 'no-store' },
  })
}
