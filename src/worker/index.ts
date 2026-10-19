// Hintergrund-Worker: Versand der Benachrichtigungen, Erinnerungen,
// Statuspflege und automatische Löschung. Läuft als eigener Prozess
// (docker compose: Dienst "worker"); mehrere Instanzen sind möglich.
import { db } from '../lib/db'
import { env } from '../lib/env'
import { processNotifications } from '../lib/jobs/notifications'
import { housekeeping, queueReminders, runRetention } from '../lib/jobs/maintenance'
import { logError } from '../lib/log'

env() // Konfiguration früh prüfen

type Job = { name: string; everyMs: number; run: () => Promise<unknown>; running: boolean; last: number }

const jobs: Job[] = [
  { name: 'Benachrichtigungen', everyMs: 15_000, run: () => processNotifications(), running: false, last: 0 },
  { name: 'Erinnerungen', everyMs: 60_000, run: () => queueReminders(), running: false, last: 0 },
  { name: 'Statuspflege', everyMs: 5 * 60_000, run: () => housekeeping(), running: false, last: 0 },
  { name: 'Löschfristen', everyMs: 60 * 60_000, run: () => runRetention(), running: false, last: 0 },
]

let stopping = false

async function tick() {
  const now = Date.now()
  for (const job of jobs) {
    if (job.running || now - job.last < job.everyMs) continue
    job.running = true
    job.last = now
    job
      .run()
      .then((result) => {
        if (result && typeof result === 'object' && Object.values(result).some((v) => typeof v === 'number' && v > 0)) {
          console.info(`[worker] ${job.name}: ${JSON.stringify(result)}`)
        }
      })
      .catch((error) => logError(`[worker] ${job.name} fehlgeschlagen`, error))
      .finally(() => {
        job.running = false
      })
  }
}

const interval = setInterval(() => {
  if (!stopping) void tick()
}, 5_000)
void tick()
console.info('[worker] gestartet')

async function shutdown(signal: string) {
  if (stopping) return
  stopping = true
  console.info(`[worker] ${signal} empfangen, beende …`)
  clearInterval(interval)
  const deadline = Date.now() + 20_000
  while (jobs.some((j) => j.running) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 200))
  await db.$disconnect()
  process.exit(0)
}

process.on('SIGTERM', () => void shutdown('SIGTERM'))
process.on('SIGINT', () => void shutdown('SIGINT'))
