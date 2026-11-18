export const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
] as const

export const OPTIONAL_ENV_KEYS = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'MOONPAY_API_KEY',
  'MOONPAY_SECRET_KEY',
  'NEXT_PUBLIC_GA_ID',
  'GA_API_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
  'VAPID_PUBLIC_KEY',
  'VAPID_PRIVATE_KEY',
  'VAPID_SUBJECT',
  'COLUMN_API_KEY',
] as const

export function getEnvStatus(key: string) {
  const value = process.env[key]
  return {
    key,
    present: Boolean(value && value.trim().length > 0),
  }
}

export function getRuntimeConfigStatus() {
  const required = REQUIRED_ENV_KEYS.map(getEnvStatus)
  const optional = OPTIONAL_ENV_KEYS.map(getEnvStatus)

  const missingRequired = required.filter((entry) => !entry.present).map((entry) => entry.key)
  const financialServicesEnabled = process.env.VAULTEX_FINANCIAL_SERVICES_ENABLED === 'true'
  const authConfigured = missingRequired.length === 0

  return {
    ok: authConfigured,
    readyForProduction: authConfigured && !financialServicesEnabled,
    financialServicesEnabled,
    required,
    optional,
    missingRequired,
  }
}
