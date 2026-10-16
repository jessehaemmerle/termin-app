'use client'

import { useEffect, useState } from 'react'
import { buttonClass } from './ui'

export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return
    navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).catch(() => {
      // Ohne Service Worker funktioniert die Seite weiterhin, nur ohne Offline-Hinweis und Push.
    })
  }, [])
  return null
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

function isIos() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

/** Hinweis zum Installieren als App (Android/Chromium: Button, iOS: Anleitung). */
export function InstallPrompt({ appName, compact = false }: { appName: string; compact?: boolean }) {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null)
  const [mode, setMode] = useState<'hidden' | 'prompt' | 'ios'>('hidden')

  useEffect(() => {
    if (isStandalone()) return
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BeforeInstallPromptEvent)
      setMode('prompt')
    }
    window.addEventListener('beforeinstallprompt', onPrompt)
    // iOS kennt kein beforeinstallprompt -> Anleitung anzeigen (asynchron, nach dem ersten Rendern)
    const timer = isIos() ? window.setTimeout(() => setMode('ios'), 0) : undefined
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt)
      if (timer) window.clearTimeout(timer)
    }
  }, [])

  if (mode === 'hidden') return null

  if (mode === 'ios') {
    return (
      <div className={`border border-rule bg-surface rounded-[var(--radius-control)] px-4 py-3 text-sm ${compact ? '' : 'mt-4'}`}>
        <p className="font-semibold">{appName} als App nutzen</p>
        <p className="text-graphite mt-1">
          Tippen Sie in Safari auf <span className="font-semibold">Teilen</span> und dann auf{' '}
          <span className="font-semibold">Zum Home-Bildschirm</span>.
        </p>
      </div>
    )
  }

  return (
    <button
      type="button"
      className={buttonClass('secondary', compact ? 'min-h-10 px-3 text-sm' : 'w-full sm:w-auto')}
      onClick={async () => {
        if (!deferred) return
        await deferred.prompt()
        await deferred.userChoice
        setDeferred(null)
        setMode('hidden')
      }}
    >
      Als App installieren
    </button>
  )
}
