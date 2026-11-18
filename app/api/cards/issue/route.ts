import { NextResponse } from 'next/server'
import { requireFinancialServiceAccess } from '@/lib/financial-gates'

export async function POST() {
  const gateResponse = requireFinancialServiceAccess(
    'Card issuance is unavailable until identity verification, card-program approval, and user ownership controls are implemented.'
  )

  if (gateResponse) {
    return gateResponse
  }

  return NextResponse.json({ ok: true })
}
