'use client'

import { useEffect, useState, useSyncExternalStore } from 'react'

interface PushSettings {
  configured: boolean
  publicKey: string | null
}

class NotificationRequestError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

function isPushSettings(value: unknown): value is PushSettings {
  return (
    !!value &&
    typeof value === 'object' &&
    'configured' in value &&
    typeof value.configured === 'boolean' &&
    'publicKey' in value &&
    (typeof value.publicKey === 'string' || value.publicKey === null)
  )
}

function getErrorMessage(value: unknown, fallback: string) {
  return value instanceof Error ? value.message : fallback
}

function subscribeToSupportChanges() {
  return () => {}
}

function getPushSupportSnapshot() {
  return (
    typeof window !== 'undefined' &&
    window.isSecureContext &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  )
}

function getPushSupportServerSnapshot() {
  return false
}

function decodeVapidKey(value: string) {
  const padded = value + '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/')
  const raw = window.atob(base64)
  const key = new Uint8Array(raw.length)

  for (let index = 0; index < raw.length; index += 1) {
    key[index] = raw.charCodeAt(index)
  }

  return key
}

async function postPushAction(payload: Record<string, unknown>) {
  const response = await fetch('/api/push', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const result: unknown = await response.json()
  if (!response.ok) {
    throw new NotificationRequestError(
      result &&
        typeof result === 'object' &&
        'error' in result &&
        typeof result.error === 'string'
        ? result.error
        : 'Notification request failed.',
      response.status,
    )
  }

  return result
}

export default function NotificationSettings() {
  const [settings, setSettings] = useState<PushSettings | null>(null)
  const supported = useSyncExternalStore(
    subscribeToSupportChanges,
    getPushSupportSnapshot,
    getPushSupportServerSnapshot,
  )
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    fetch('/api/push', { cache: 'no-store' })
      .then(async (response) => {
        const result: unknown = await response.json()
        if (!response.ok) {
          throw new Error(
            result &&
              typeof result === 'object' &&
              'error' in result &&
              typeof result.error === 'string'
              ? result.error
              : 'Unable to load notification settings.',
          )
        }
        if (!isPushSettings(result)) {
          throw new Error('Notification settings response is invalid.')
        }
        setSettings(result)
      })
      .catch((error: unknown) => {
        setMessage(getErrorMessage(error, 'Unable to load notification settings.'))
      })

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .getRegistration('/')
        .then((registration) => registration?.pushManager.getSubscription())
        .then((subscription) => setSubscribed(Boolean(subscription)))
        .catch(() => setSubscribed(false))
    }
  }, [])

  async function enableNotifications() {
    if (!settings?.configured || !settings.publicKey || !supported) return

    setBusy(true)
    setMessage('')
    try {
      const permission =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission

      if (permission !== 'granted') {
        setMessage(
          permission === 'denied'
            ? 'Notifications are blocked in browser settings. Allow them for this site, then try again.'
            : 'Notification permission was not granted.',
        )
        return
      }

      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
      })
      const existing = await registration.pushManager.getSubscription()
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: decodeVapidKey(settings.publicKey),
        }))

      await postPushAction({
        action: 'subscribe',
        subscription: subscription.toJSON(),
      })
      setSubscribed(true)
      setMessage('Notifications are enabled on this device.')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to enable notifications.'))
    } finally {
      setBusy(false)
    }
  }

  async function disableNotifications() {
    setBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.getRegistration('/')
      const subscription = await registration?.pushManager.getSubscription()
      if (subscription) {
        await postPushAction({ action: 'unsubscribe', endpoint: subscription.endpoint })
        setSubscribed(false)
        await subscription.unsubscribe()
      }
      setSubscribed(false)
      setMessage('Notifications are disabled on this device.')
    } catch (error) {
      setMessage(getErrorMessage(error, 'Unable to disable notifications.'))
    } finally {
      setBusy(false)
    }
  }

  async function sendTestNotification() {
    setBusy(true)
    setMessage('')
    try {
      await postPushAction({ action: 'test' })
      setMessage('Test push accepted for delivery to your enabled devices.')
    } catch (error) {
      if (error instanceof NotificationRequestError && error.status === 410) {
        setSubscribed(false)
      }
      setMessage(getErrorMessage(error, 'Unable to send a test notification.'))
    } finally {
      setBusy(false)
    }
  }

  const buttonStyle = {
    minHeight: 42,
    padding: '10px 16px',
    borderRadius: 8,
    border: '1px solid var(--cyan)',
    background: 'var(--cyan)',
    color: '#001',
    cursor: busy ? 'wait' as const : 'pointer' as const,
    fontWeight: 700,
  }

  return (
    <div className="card" style={{ maxWidth: 700 }}>
      {!supported && (
        <p role="status">Web Push notifications require a supported browser and a secure (HTTPS) connection.</p>
      )}
      {supported && settings && !settings.configured && (
        <p role="status">Push delivery is not configured on this server yet.</p>
      )}
      {supported && settings?.configured && (
        <>
          <p style={{ marginBottom: 16 }}>
            {subscribed
              ? 'This device is subscribed to VAULTEX push notifications.'
              : 'This device is not subscribed. You can enable notifications at any time.'}
          </p>
          <div className="actions" style={{ justifyContent: 'flex-start' }}>
            {subscribed ? (
              <>
                <button style={buttonStyle} type="button" onClick={sendTestNotification} disabled={busy}>
                  {busy ? 'WORKING…' : 'SEND TEST'}
                </button>
                <button
                  style={{ ...buttonStyle, background: 'transparent', color: 'var(--text)' }}
                  type="button"
                  onClick={disableNotifications}
                  disabled={busy}
                >
                  DISABLE
                </button>
              </>
            ) : (
              <button style={buttonStyle} type="button" onClick={enableNotifications} disabled={busy}>
                {busy ? 'WORKING…' : 'ENABLE NOTIFICATIONS'}
              </button>
            )}
          </div>
        </>
      )}
      {message && <p role="status" aria-live="polite" style={{ marginTop: 16 }}>{message}</p>}
    </div>
  )
}
