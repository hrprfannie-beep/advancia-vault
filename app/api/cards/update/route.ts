import { NextResponse } from 'next/server'
import { requireFinancialServiceAccess } from '@/lib/financial-gates'

export async function POST() {
  const gateResponse = requireFinancialServiceAccess(
    'Card management is unavailable until authenticated card ownership and the required program controls are implemented.'
  )

  if (gateResponse) {
    return gateResponse
  }

  return NextResponse.json({ ok: true })
}
