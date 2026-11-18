import { NextResponse } from 'next/server'

export function requireFinancialServiceAccess(
  message = 'Financial services are unavailable until KYC, ownership verification, and provider controls are implemented.'
) {
  if (process.env.VAULTEX_FINANCIAL_SERVICES_ENABLED !== 'true') {
    return NextResponse.json(
      {
        error: message,
      },
      { status: 503 }
    )
  }

  return null
}
