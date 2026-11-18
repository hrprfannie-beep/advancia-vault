const COLUMN_API_BASE_URL = 'https://api.column.com'

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
