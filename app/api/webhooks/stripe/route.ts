import { NextRequest, NextResponse } from 'next/server'
import { getStripe } from '@/lib/stripe'
import { getUserIdForStripeCardholder, saveTransaction } from '@/lib/supabase'
import { requireFinancialServiceAccess } from '@/lib/financial-gates'

const SUPPORTED_STRIPE_EVENTS = new Set(['issuing_transaction.created', 'issuing_authorization.request'])

function getNumericOrNull(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null
  return value
}

export async function POST(req: NextRequest) {
  const gateResponse = requireFinancialServiceAccess(
    'Stripe webhook processing is unavailable until KYC, verified ownership, and provider controls are implemented.'
  )

  if (gateResponse) {
    return gateResponse
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: 'Stripe webhook is not configured' },
      { status: 503 }
    )
  }

  const sig = req.headers.get('stripe-signature')
  if (!sig) {
    return NextResponse.json(
      { error: 'Missing Stripe signature' },
      { status: 400 }
    )
  }

  const body = await req.text()
  let event
  try {
    event = getStripe().webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json(
      { error: 'Invalid Stripe webhook signature or payload' },
      { status: 400 }
    )
  }

  if (!event || typeof event !== 'object' || typeof event.type !== 'string') {
    return NextResponse.json({ error: 'Invalid Stripe event payload' }, { status: 400 })
  }

  if (!SUPPORTED_STRIPE_EVENTS.has(event.type)) {
    return NextResponse.json({ received: true, ignored: true })
  }

  switch (event.type) {
    case 'issuing_transaction.created': {
      const tx = event.data?.object
      const amount = getNumericOrNull(tx?.amount)
      const providerEventId = typeof event.id === 'string' ? event.id : ''
      const cardholderId =
        typeof tx?.cardholder === 'string' ? tx.cardholder : tx?.cardholder?.id

      if (
        !tx ||
        typeof tx !== 'object' ||
        amount === null ||
        !cardholderId ||
        !providerEventId ||
        typeof tx.id !== 'string'
      ) {
        return NextResponse.json(
          { error: 'Stripe transaction is missing required metadata' },
          { status: 400 }
        )
      }

      let userId: string | null
      try {
        userId = await getUserIdForStripeCardholder(cardholderId)
      } catch (error) {
        console.error('Stripe cardholder lookup failed:', error)
        return NextResponse.json(
          { error: 'Unable to resolve Stripe transaction owner' },
          { status: 503 }
        )
      }

      if (!userId) {
        return NextResponse.json(
          { error: 'Stripe transaction cardholder is not linked to a VAULTEX user' },
          { status: 503 }
        )
      }

      const amountInUsd = Math.abs(amount) / 100

      try {
        await saveTransaction({
          user_id: userId,
          type: 'card_spend',
          from_token: 'USDC',
          to_token: null,
          from_amount: amountInUsd,
          to_amount: null,
          usd_value: amountInUsd,
          tx_hash: tx.id,
          status: 'confirmed',
          chain: 'stripe',
          fee_usd: 0,
          provider_event_id: providerEventId,
        })
      } catch (error) {
        console.error('Stripe transaction persistence failed:', error)
        return NextResponse.json(
          { error: 'Unable to persist Stripe transaction event' },
          { status: 503 }
        )
      }
      break
    }
    case 'issuing_authorization.request':
      // No verified authorization policy is implemented, so fail closed.
      return NextResponse.json({ approved: false })
  }

  return NextResponse.json({ received: true })
}
