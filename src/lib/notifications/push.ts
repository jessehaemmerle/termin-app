import webpush from 'web-push'
import { db } from '../db'
import { env } from '../env'

let configured = false

function configure() {
  const e = env()
  if (!e.VAPID_PUBLIC_KEY || !e.VAPID_PRIVATE_KEY) return false
  if (!configured) {
    webpush.setVapidDetails(e.VAPID_SUBJECT, e.VAPID_PUBLIC_KEY, e.VAPID_PRIVATE_KEY)
    configured = true
  }
  return true
}

/**
 * Sendet eine Push-Nachricht an alle Geräte einer Person. Inhalte werden nach
 * RFC 8291 Ende-zu-Ende verschlüsselt; der Push-Dienst sieht nur Metadaten.
 * Abgelaufene Abos (404/410) werden entfernt.
 */
export async function sendPushToUser(userId: string, payload: { title: string; body: string; url: string; tag?: string }) {
  if (!configure()) return { sent: 0, skipped: true }
  const subscriptions = await db.pushSubscription.findMany({ where: { userId } })
  let sent = 0
  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, JSON.stringify(payload), { TTL: 3600, urgency: 'normal' })
      sent++
    } catch (error) {
      const status = (error as { statusCode?: number }).statusCode
      if (status === 404 || status === 410) await db.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined)
      else throw error
    }
  }
  return { sent, skipped: false }
}
