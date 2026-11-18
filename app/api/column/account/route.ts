import { NextResponse } from 'next/server'
import { getColumnSandboxBankAccount, summarizeColumnSandboxBankAccount } from '@/lib/column'
import { getSessionClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

const responseHeaders = { 'Cache-Control': 'private, no-store' }

function jsonResponse(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: responseHeaders })
}

export async function GET() {
  let supabase
  try {
    supabase = await getSessionClient()
  } catch (error) {
    console.error('Column sandbox authentication is not configured:', error)
    return jsonResponse({ error: 'Supabase authentication is not configured.' }, 503)
  }

  const { data, error } = await supabase.auth.getUser()
  if (error) {
    if (error.name === 'AuthSessionMissingError') {
      return jsonResponse({ error: 'Authentication required.' }, 401)
    }
    console.error('Column sandbox authentication failed:', error.message)
    return jsonResponse({ error: 'Unable to verify authentication.' }, 503)
  }
  if (!data.user) {
    return jsonResponse({ error: 'Authentication required.' }, 401)
  }

  const ownerUserId = process.env.COLUMN_SANDBOX_OWNER_USER_ID?.trim()
  if (!ownerUserId) {
    return jsonResponse({ error: 'Column sandbox ownership is not configured.' }, 503)
  }
  if (data.user.id !== ownerUserId) {
    return jsonResponse({ error: 'Access denied.' }, 403)
  }

  const bankAccountId = process.env.COLUMN_SANDBOX_BANK_ACCOUNT_ID?.trim()
  if (!bankAccountId || !process.env.COLUMN_API_KEY?.trim()?.startsWith('test_')) {
    return jsonResponse({ error: 'Column sandbox configuration is incomplete.' }, 503)
  }
  if (!/^bacc_[A-Za-z0-9]+$/.test(bankAccountId)) {
    return jsonResponse({ error: 'Column sandbox account configuration is invalid.' }, 503)
  }

  try {
    const response = await getColumnSandboxBankAccount(bankAccountId)
    const account = summarizeColumnSandboxBankAccount(response)
    return jsonResponse({ account }, 200)
  } catch (error) {
    console.error('Column sandbox account lookup failed:', error)
    return jsonResponse({ error: 'Column sandbox account lookup failed.' }, 502)
  }
}
