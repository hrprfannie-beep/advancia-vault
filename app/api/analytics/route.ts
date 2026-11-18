import { NextRequest, NextResponse } from 'next/server'

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? ''
const GA_API_SECRET = process.env.GA_API_SECRET ?? ''
const VALID_EVENT_NAME = /^[a-zA-Z0-9_]+$/

function sanitizeParams(value: unknown): Record<string, string | number | boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {}
  }

  const safe: Record<string, string | number | boolean> = {}

  for (const [key, raw] of Object.entries(value)) {
    if (!/^[a-zA-Z0-9_]+$/.test(key)) continue

    if (
      typeof raw === 'string' && raw.length <= 100 && raw.trim().length > 0
    ) {
      safe[key] = raw.trim()
    } else if (typeof raw === 'number' && Number.isFinite(raw)) {
      safe[key] = raw
    } else if (typeof raw === 'boolean') {
      safe[key] = raw
    }
  }

  return safe
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json()
    const name = typeof payload?.name === 'string' ? payload.name.trim() : ''
    const params = sanitizeParams(payload?.params)
    const clientId = typeof payload?.clientId === 'string' ? payload.clientId.trim() : 'anonymous'

    if (!GA_MEASUREMENT_ID || !GA_API_SECRET) {
      return NextResponse.json({ skipped: true })
    }

    if (!VALID_EVENT_NAME.test(name)) {
      return NextResponse.json({ error: 'Invalid analytics event name.' }, { status: 400 })
    }

    if (clientId.length > 255) {
      return NextResponse.json({ error: 'Invalid clientId.' }, { status: 400 })
    }

    await fetch(
      `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          events: [{ name, params }],
        }),
      }
    )

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Analytics request failed' },
      { status: 500 }
    )
  }
}
