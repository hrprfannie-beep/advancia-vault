import 'server-only'

import * as webPush from 'web-push'

export interface PushSubscriptionPayload {
  endpoint: string
  expirationTime?: number | null
  keys: {
    p256dh: string
    auth: string
  }
}

export function getVapidConfig() {
  const publicKey = process.env.VAPID_PUBLIC_KEY ?? ''
  const privateKey = process.env.VAPID_PRIVATE_KEY ?? ''
  const subject = process.env.VAPID_SUBJECT ?? ''

  if (!publicKey || !privateKey || !subject) {
    return null
  }

  if (!subject.startsWith('mailto:') && !subject.startsWith('https://')) {
    throw new Error('VAPID_SUBJECT must be a mailto: address or HTTPS URL.')
  }

  try {
    webPush.setVapidDetails(subject, publicKey, privateKey)
  } catch {
    throw new Error('VAPID key configuration is invalid.')
  }

  return { publicKey, privateKey, subject }
}

export function isPushSubscriptionPayload(
  value: unknown,
): value is PushSubscriptionPayload {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false
  }

  const subscription = value as Record<string, unknown>
  if (typeof subscription.endpoint !== 'string' || typeof subscription.keys !== 'object') {
    return false
  }

  const keys = subscription.keys as Record<string, unknown> | null
  return (
    !!keys &&
    typeof keys.p256dh === 'string' &&
    keys.p256dh.length > 0 &&
    keys.p256dh.length <= 256 &&
    typeof keys.auth === 'string' &&
    keys.auth.length > 0 &&
    keys.auth.length <= 256 &&
    isAllowedPushEndpoint(subscription.endpoint)
  )
}

export function isAllowedPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint)
    if (url.protocol !== 'https:' || url.username || url.password) {
      return false
    }

    const hostname = url.hostname.toLowerCase()
    return (
      hostname === 'fcm.googleapis.com' ||
      hostname === 'push.services.mozilla.com' ||
      hostname.endsWith('.push.services.mozilla.com') ||
      hostname === 'web.push.apple.com' ||
      hostname.endsWith('.notify.windows.com')
    )
  } catch {
    return false
  }
}

export async function sendPushNotification(
  subscription: PushSubscriptionPayload,
  payload: { title: string; body: string; url: string },
) {
  const config = getVapidConfig()
  if (!config) {
    throw new Error('Web Push is not configured.')
  }

  webPush.setVapidDetails(config.subject, config.publicKey, config.privateKey)
  return webPush.sendNotification(subscription, JSON.stringify(payload), {
    TTL: 60,
    urgency: 'normal',
  })
}
