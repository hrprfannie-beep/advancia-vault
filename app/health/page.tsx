import { getRuntimeConfigStatus } from '@/lib/env'

export default function HealthPage() {
  const status = getRuntimeConfigStatus()

  return (
    <main style={{ maxWidth: 900, margin: '0 auto', padding: 32, color: '#E2EAF5' }}>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontSize: 36, marginBottom: 16 }}>System Status</h1>

      <div
        style={{
          border: '1px solid rgba(0,240,255,0.35)',
          borderRadius: 12,
          background: status.readyForProduction ? 'rgba(0,240,255,0.08)' : 'rgba(255,140,66,0.08)',
          padding: 16,
          marginBottom: 24,
        }}
      >
        <strong>{status.readyForProduction ? 'Ready for current pre-live deployment.' : 'Not ready for production.'}</strong>
        <div style={{ marginTop: 8, color: '#9DB0C8' }}>
          {status.financialServicesEnabled
            ? 'Financial services are intentionally disabled by the feature gate.'
            : 'Financial services remain disabled until verified controls are implemented.'}
        </div>
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        <section style={{ border: '1px solid rgba(128,128,128,0.35)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Required configuration</h2>
          {status.required.map((entry) => (
            <div key={entry.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
              <span>{entry.key}</span>
              <span style={{ color: entry.present ? '#00E5A0' : '#FF8C42', fontWeight: 700 }}>
                {entry.present ? 'present' : 'missing'}
              </span>
            </div>
          ))}
        </section>

        <section style={{ border: '1px solid rgba(128,128,128,0.35)', borderRadius: 12, padding: 16 }}>
          <h2 style={{ marginBottom: 12 }}>Optional integrations</h2>
          {status.optional.map((entry) => (
            <div key={entry.key} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '8px 0', borderBottom: '1px solid rgba(128,128,128,0.2)' }}>
              <span>{entry.key}</span>
              <span style={{ color: entry.present ? '#00E5A0' : '#6A7D96', fontWeight: 700 }}>
                {entry.present ? 'configured' : 'not configured'}
              </span>
            </div>
          ))}
        </section>
      </div>
    </main>
  )
}
