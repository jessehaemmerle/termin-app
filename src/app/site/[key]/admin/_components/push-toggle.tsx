'use client'

import { useEffect, useState } from 'react'
import { buttonClass } from '@/components/ui'

function base64ToUint8Array(base64: string) {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const raw = atob((base64 + padding).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, (c) => c.charCodeAt(0))
}

type State = 'loading' | 'unsupported' | 'denied' | 'off' | 'on'

export function PushToggle({ publicKey }: { publicKey: string | null }) {
  const [state, setState] = useState<State>('loading')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function check() {
      if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return 'unsupported' as const
      if (Notification.permission === 'denied') return 'denied' as const
      const registration = await navigator.serviceWorker.ready
      return (await registration.pushManager.getSubscription()) ? ('on' as const) : ('off' as const)
    }
    check().then((s) => !cancelled && setState(s)).catch(() => !cancelled && setState('unsupported'))
    return () => {
      cancelled = true
    }
  }, [publicKey])

  async function enable() {
    setBusy(true)
    setError(null)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setState(permission === 'denied' ? 'denied' : 'off')
        return
      }
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ToUint8Array(publicKey!) })
      const response = await fetch('/admin/api/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription) })
      if (!response.ok) throw new Error()
      setState('on')
    } catch {
      setError('Push-Benachrichtigungen konnten nicht aktiviert werden.')
    } finally {
      setBusy(false)
    }
  }

  async function disable() {
    setBusy(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/admin/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) })
        await subscription.unsubscribe()
      }
      setState('off')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-3" aria-live="polite">
      {state === 'loading' && <p className="text-graphite">Wird geprüft …</p>}
      {state === 'unsupported' && (
        <p className="text-graphite">
          Auf diesem Gerät nicht verfügbar. Auf dem iPhone funktionieren Push-Benachrichtigungen nur, wenn die Verwaltung als App auf dem Home-Bildschirm installiert ist (iOS 16.4 oder neuer).
        </p>
      )}
      {state === 'denied' && <p className="text-graphite">Benachrichtigungen sind in den Browser-Einstellungen blockiert. Erlaube sie dort für diese Seite.</p>}
      {state === 'off' && (
        <button type="button" className={buttonClass('secondary')} onClick={enable} disabled={busy}>
          {busy ? 'Wird aktiviert …' : 'Auf diesem Gerät aktivieren'}
        </button>
      )}
      {state === 'on' && (
        <>
          <p className="font-semibold text-ok">Auf diesem Gerät aktiv.</p>
          <button type="button" className={buttonClass('quiet')} onClick={disable} disabled={busy}>
            Auf diesem Gerät deaktivieren
          </button>
        </>
      )}
      {error && <p role="alert" className="text-danger font-semibold">{error}</p>}
    </div>
  )
}
