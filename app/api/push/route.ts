import { NextRequest, NextResponse } from 'next/server'
import { getSessionClient } from '@/lib/supabase/server'
import {
  getVapidConfig,
  isPushSubscriptionPayload,
  sendPushNotification,
} from '@/lib/push-notifications'

export const runtime = 'nodejs'

async function getAuthenticatedUser() {
  let supabase
  try {
    supabase = await getSessionClient()
  } catch (error) {
    console.error('Push subscription authentication is not configured:', error)
    return { response: NextResponse.json({ error: 'Supabase authentication is not configured' }, { status: 503 }) }
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
    }
    console.error('Push subscription authentication failed:', error.message)
    return { response: NextResponse.json({ error: 'Unable to verify authentication' }, { status: 503 }) }
  }
  if (!data.user) {
    return { response: NextResponse.json({ error: 'Authentication required' }, { status: 401 }) }
  }

  return { supabase, user: data.user }
}

export async function GET() {
  const auth = await getAuthenticatedUser()
  if ('response' in auth) return auth.response

  let vapid
  try {
    vapid = getVapidConfig()
  } catch (error) {
    console.error('Web Push configuration is invalid:', error)
    return NextResponse.json({ error: 'Web Push configuration is invalid' }, { status: 503 })
  }

  return NextResponse.json({
    configured: Boolean(vapid),
    publicKey: vapid?.publicKey ?? null,
  }, {
    headers: { 'Cache-Control': 'private, no-store' },
  })
}

export async function POST(req: NextRequest) {
  const auth = await getAuthenticatedUser()
  if ('response' in auth) return auth.response

  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > 16_384) {
    return NextResponse.json({ error: 'Request body is too large' }, { status: 413 })
  }

  let payload: unknown
  try {
    const body = await req.text()
    if (body.length > 16_384) {
      return NextResponse.json({ error: 'Request body is too large' }, { status: 413 })
    }
    payload = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const request = payload as Record<string, unknown>
  const action = request.action ?? 'subscribe'
  if (action !== 'subscribe' && action !== 'unsubscribe' && action !== 'test') {
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  }

  if (action === 'unsubscribe') {
    if (typeof request.endpoint !== 'string' || !request.endpoint) {
      return NextResponse.json({ error: 'A subscription endpoint is required' }, { status: 400 })
    }

    const { error } = await auth.supabase
      .from('push_subscriptions')
      .delete()
      .eq('owner_user_id', auth.user.id)
      .eq('endpoint', request.endpoint)

    if (error) {
      console.error('Push subscription removal failed:', error.message)
      return NextResponse.json({ error: 'Unable to disable notifications' }, { status: 503 })
    }

    return NextResponse.json({ success: true })
  }

  if (action === 'subscribe') {
    let vapid
    try {
      vapid = getVapidConfig()
    } catch (error) {
      console.error('Web Push configuration is invalid:', error)
      return NextResponse.json({ error: 'Web Push configuration is invalid' }, { status: 503 })
    }
    if (!vapid) {
      return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 })
    }

    if (!isPushSubscriptionPayload(request.subscription)) {
      return NextResponse.json(
        { error: 'A valid supported push subscription is required' },
        { status: 400 }
      )
    }

    const subscriptionJson = JSON.stringify(request.subscription)
    if (subscriptionJson.length > 12000) {
      return NextResponse.json({ error: 'Push subscription payload is too large.' }, { status: 400 })
    }

    const { count, error: countError } = await auth.supabase
      .from('push_subscriptions')
      .select('id', { count: 'exact', head: true })
      .eq('owner_user_id', auth.user.id)

    if (countError) {
      console.error('Push subscription limit check failed:', countError.message)
      return NextResponse.json({ error: 'Unable to save notification settings' }, { status: 503 })
    }
    if ((count ?? 0) >= 5) {
      const { data: existing, error: existingError } = await auth.supabase
        .from('push_subscriptions')
        .select('id')
        .eq('owner_user_id', auth.user.id)
        .eq('endpoint', request.subscription.endpoint)
        .maybeSingle()

      if (existingError) {
        console.error('Push subscription lookup failed:', existingError.message)
        return NextResponse.json({ error: 'Unable to save notification settings' }, { status: 503 })
      }
      if (!existing) {
        return NextResponse.json({ error: 'A maximum of five devices can be enabled' }, { status: 409 })
      }
    }

    const { error } = await auth.supabase.from('push_subscriptions').upsert(
      {
        owner_user_id: auth.user.id,
        endpoint: request.subscription.endpoint,
        subscription: subscriptionJson,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'endpoint' }
    )

    if (error) {
      console.error('Push subscription update failed:', error.message)
      return NextResponse.json({ error: 'Unable to save notification settings' }, { status: 503 })
    }

    return NextResponse.json({ success: true })
  }

  let vapid
  try {
    vapid = getVapidConfig()
  } catch (error) {
    console.error('Web Push configuration is invalid:', error)
    return NextResponse.json({ error: 'Web Push configuration is invalid' }, { status: 503 })
  }
  if (!vapid) {
    return NextResponse.json({ error: 'Web Push is not configured' }, { status: 503 })
  }

  const { data, error } = await auth.supabase
    .from('push_subscriptions')
    .select('subscription')
    .eq('owner_user_id', auth.user.id)

  if (error) {
    console.error('Push subscription lookup failed:', error.message)
    return NextResponse.json({ error: 'Unable to load notification subscription' }, { status: 503 })
  }
  if (!data?.length) {
    return NextResponse.json({ error: 'Enable notifications before sending a test' }, { status: 404 })
  }

  let sent = 0
  let stale = 0
  for (const row of data) {
    let subscription: unknown
    try {
      subscription = JSON.parse(row.subscription)
    } catch {
      console.error('Stored push subscription is invalid JSON for user:', auth.user.id)
      continue
    }

    if (!isPushSubscriptionPayload(subscription)) {
      console.error('Stored push subscription is invalid for user:', auth.user.id)
      continue
    }

    try {
      await sendPushNotification(subscription, {
        title: 'VAULTEX notification test',
        body: 'Push notifications are enabled for your account.',
        url: '/notifications',
      })
      sent += 1
    } catch (error) {
      const statusCode =
        typeof error === 'object' && error !== null && 'statusCode' in error
          ? error.statusCode
          : undefined

      if (statusCode === 404 || statusCode === 410) {
        stale += 1
        const { error: deleteError } = await auth.supabase
          .from('push_subscriptions')
          .delete()
          .eq('owner_user_id', auth.user.id)
          .eq('endpoint', subscription.endpoint)
        if (deleteError) {
          console.error('Expired push subscription cleanup failed:', deleteError.message)
        }
      } else {
        console.error('Test push delivery failed:', error)
      }
    }
  }

  if (sent === 0) {
    return NextResponse.json({
      error: stale > 0
        ? 'This browser subscription expired. Enable notifications again.'
        : 'Unable to send a test notification. Please check your subscription and try again.',
    }, { status: stale > 0 ? 410 : 502 })
  }

  return NextResponse.json({ success: true, sent })
}
