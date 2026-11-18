import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getSessionClient } from '@/lib/supabase/server'
import { getSupabaseConfigErrorMessage } from '@/lib/supabase/config'
import NotificationSettings from './notification-settings'

export const dynamic = 'force-dynamic'

export default async function NotificationsPage() {
  let supabase
  try {
    supabase = await getSessionClient()
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(getSupabaseConfigErrorMessage(error))}`)
  }

  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) redirect('/login')

  return (
    <main className="page">
      <header className="nav">
        <Link className="brand" href="/" aria-label="VAULTEX home">
          VAULT<span>EX</span>
        </Link>
        <nav aria-label="Main navigation">
          <a href="/dashboard">Dashboard</a>
          <a href="/support">Support</a>
        </nav>
      </header>
      <section className="section">
        <div className="section-heading">
          <p className="eyebrow">Account preferences</p>
          <h1>Notifications</h1>
          <p className="feature-card" style={{ maxWidth: 700, color: 'var(--muted)' }}>
            Notifications are optional. Enable them on this device only if you want
            to receive a user-requested test push from VAULTEX. Your browser
            subscription is associated with your account and shared with its push
            delivery provider. See our{' '}
            <Link href="/legal/privacy">Privacy Policy</Link>.
          </p>
        </div>
        <NotificationSettings />
      </section>
    </main>
  )
}
