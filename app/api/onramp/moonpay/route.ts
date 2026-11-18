import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { requireFinancialServiceAccess } from '@/lib/financial-gates'

const MOONPAY_KEY = process.env.MOONPAY_API_KEY ?? ''
const MOONPAY_SECRET = process.env.MOONPAY_SECRET_KEY ?? ''
const VALID_CURRENCIES = new Set(['btc', 'eth', 'usdc', 'usdt', 'sol'])
const VALID_BASE_CURRENCIES = new Set(['usd', 'eur', 'gbp'])

function coerceNumber(value: unknown, fallback: number, max: number) {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.min(value, max)
  }

  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.min(parsed, max)
    }
  }

  return fallback
}

export async function POST(req: NextRequest) {
  const gateResponse = requireFinancialServiceAccess(
    'On-ramp access is unavailable until KYC, ownership checks, and provider controls are implemented.'
  )

  if (gateResponse) {
    return gateResponse
  }

  try {
    const payload = await req.json()
    const walletAddress = typeof payload?.walletAddress === 'string' ? payload.walletAddress.trim() : ''
    const currencyCode = typeof payload?.currencyCode === 'string' ? payload.currencyCode.trim().toLowerCase() : 'eth'
    const baseCurrencyCode = typeof payload?.baseCurrencyCode === 'string' ? payload.baseCurrencyCode.trim().toLowerCase() : 'usd'
    const requestedAmount = coerceNumber(payload?.baseCurrencyAmount, 100, 250000)

    if (!walletAddress || walletAddress.length > 255) {
      return NextResponse.json({ error: 'A valid wallet address is required.' }, { status: 400 })
    }

    if (!VALID_CURRENCIES.has(currencyCode)) {
      return NextResponse.json({ error: 'Unsupported currencyCode.' }, { status: 400 })
    }

    if (!VALID_BASE_CURRENCIES.has(baseCurrencyCode)) {
      return NextResponse.json({ error: 'Unsupported baseCurrencyCode.' }, { status: 400 })
    }

    if (requestedAmount <= 0 || requestedAmount > 250000) {
      return NextResponse.json({ error: 'baseCurrencyAmount must be greater than 0 and within the supported range.' }, { status: 400 })
    }

    const params = new URLSearchParams({
      apiKey: MOONPAY_KEY || 'pk_test_placeholder',
      currencyCode,
      baseCurrencyCode,
      baseCurrencyAmount: String(requestedAmount),
      walletAddress,
      colorCode: '#00F0FF',
      theme: 'dark',
    })

    const base = `https://buy.moonpay.com?${params.toString()}`

    if (MOONPAY_SECRET) {
      const sig = crypto
        .createHmac('sha256', MOONPAY_SECRET)
        .update(new URL(base).search)
        .digest('base64')

      return NextResponse.json({ url: `${base}&signature=${encodeURIComponent(sig)}` })
    }

    return NextResponse.json({ url: base })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Onramp request failed' },
      { status: 500 }
    )
  }
}
