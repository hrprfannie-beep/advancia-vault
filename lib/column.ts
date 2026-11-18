const COLUMN_API_BASE_URL = 'https://api.column.com'

export type ColumnSandboxBankAccountSummary = {
  id: string
  description: string
  currencyCode: string
  status: string
  type: string
  createdAt: string
  balances: {
    availableAmount: number | null
    holdingAmount: number | null
    lockedAmount: number | null
    pendingAmount: number | null
  } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function requiredString(value: Record<string, unknown>, key: string): string {
  const field = value[key]
  if (typeof field !== 'string' || (key !== 'description' && field.length === 0)) {
    throw new Error(`Column API response is missing ${key}.`)
  }
  return field
}

function optionalAmount(value: Record<string, unknown>, key: string): number | null {
  const amount = value[key]
  if (amount === undefined || amount === null) return null
  if (typeof amount !== 'number' || !Number.isSafeInteger(amount)) {
    throw new Error(`Column API response contains an invalid ${key}.`)
  }
  return amount
}

export async function getColumnSandboxBankAccount(
  bankAccountId: string
): Promise<unknown> {
  const apiKey = process.env.COLUMN_API_KEY?.trim()
  if (!apiKey) {
    throw new Error('COLUMN_API_KEY is not configured.')
  }
  if (!apiKey.startsWith('test_')) {
    throw new Error('Only Column sandbox API keys are supported.')
  }
  if (!/^bacc_[A-Za-z0-9]+$/.test(bankAccountId)) {
    throw new Error('Invalid Column bank account ID.')
  }

  const response = await fetch(
    new URL(`/bank-accounts/${encodeURIComponent(bankAccountId)}`, COLUMN_API_BASE_URL),
    {
      method: 'GET',
      headers: {
        Authorization: `Basic ${Buffer.from(`:${apiKey}`).toString('base64')}`,
      },
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(10_000),
    }
  )

  if (!response.ok) {
    throw new Error(`Column API request failed with status ${response.status}.`)
  }

  return response.json()
}

export function summarizeColumnSandboxBankAccount(
  value: unknown
): ColumnSandboxBankAccountSummary {
  if (!isRecord(value)) {
    throw new Error('Column API returned an invalid bank account.')
  }

  const rawBalances = value.balances
  let balances: ColumnSandboxBankAccountSummary['balances'] = null
  if (rawBalances !== null) {
    if (!isRecord(rawBalances)) {
      throw new Error('Column API returned invalid account balances.')
    }

    balances = {
      availableAmount: optionalAmount(rawBalances, 'available_amount'),
      holdingAmount: optionalAmount(rawBalances, 'holding_amount'),
      lockedAmount: optionalAmount(rawBalances, 'locked_amount'),
      pendingAmount: optionalAmount(rawBalances, 'pending_amount'),
    }
  }

  return {
    id: requiredString(value, 'id'),
    description: requiredString(value, 'description'),
    currencyCode: requiredString(value, 'currency_code'),
    status: requiredString(value, 'status'),
    type: requiredString(value, 'type'),
    createdAt: requiredString(value, 'created_at'),
    balances,
  }
}
