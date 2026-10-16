import { z } from 'zod'
import { db } from '@/lib/db'
import { getStaffContext } from '@/lib/auth/guards'
import { isSameOrigin } from '@/lib/same-origin'

const subscriptionSchema = z.object({
  endpoint: z.url().max(1000).refine((u) => u.startsWith('https://'), 'Nur HTTPS-Push-Dienste'),
  keys: z.object({ p256dh: z.string().min(10).max(200), auth: z.string().min(10).max(100) }),
})

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response('Ungültige Herkunft', { status: 403 })
  const ctx = await getStaffContext()
  if (!ctx) return new Response('Nicht angemeldet', { status: 401 })
  const parsed = subscriptionSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return new Response('Ungültige Anmeldung', { status: 400 })
  const { endpoint, keys } = parsed.data
  await db.pushSubscription.upsert({
    where: { endpoint },
    create: { endpoint, p256dh: keys.p256dh, auth: keys.auth, userId: ctx.user.id, tenantId: ctx.tenant.id },
    update: { p256dh: keys.p256dh, auth: keys.auth, userId: ctx.user.id, tenantId: ctx.tenant.id },
  })
  return Response.json({ ok: true })
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return new Response('Ungültige Herkunft', { status: 403 })
  const ctx = await getStaffContext()
  if (!ctx) return new Response('Nicht angemeldet', { status: 401 })
  const body = (await request.json().catch(() => null)) as { endpoint?: string } | null
  if (body?.endpoint) await db.pushSubscription.deleteMany({ where: { endpoint: body.endpoint, userId: ctx.user.id } })
  return Response.json({ ok: true })
}
