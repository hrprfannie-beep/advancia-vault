import Link from 'next/link'

export const metadata = { title: 'Privacy Policy — VAULTEX' }
export default function Privacy() {
  return (
    <div style={{ minHeight:'100vh',background:'#060A12',padding:'60px 24px' }}>
      <div style={{ maxWidth:720,margin:'0 auto' }}>
        <Link href="/" style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:18,letterSpacing:3,color:'#fff',textDecoration:'none',display:'block',marginBottom:10 }}>VAULT<span style={{color:'#00F0FF'}}>EX</span></Link>
        <Link href="/legal" style={{ fontSize:11,color:'#6A7D96',textDecoration:'none',display:'block',marginBottom:32 }}>← Back to Legal</Link>
        <h1 style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:32,color:'#fff',marginBottom:6 }}>Privacy Policy</h1>
        <p style={{ color:'#6A7D96',marginBottom:32,fontSize:12 }}>Last updated: November 8, 2026</p>
        <div style={{ color:'#8A9CB5',lineHeight:1.9,fontSize:13 }}>
          {[
            ['Information We Collect','We collect information you provide and information needed to operate enabled features. If you enable Web Push, we store the browser push endpoint and subscription keys supplied by your browser, associated with your signed-in account. Do not include sensitive financial information in notification content.'],
            ['How We Use Your Information','We use your information to provide and improve enabled services, operate account authentication, prevent abuse, and meet legal obligations. Web Push is optional and is used only after you grant browser permission and enable it in Notification Settings. The current notification feature sends a user-requested test message.'],
            ['Data Sharing','We do not sell personal data. When you enable Web Push, notification payloads and delivery metadata are sent through the browser-selected push service (such as Apple, Google, Mozilla, or Microsoft) so it can deliver the notification to your device. Those providers process data under their own privacy terms.'],
            ['Data Retention','A Web Push subscription is stored while enabled and is removed when you disable it in Notification Settings or when your account is deleted. Delivery providers may retain information under their own policies. Other data retention periods depend on the enabled service and applicable legal obligations.'],
            ['Your Notification Choices','Web Push is opt-in. You can disable a registered device from the authenticated Notification Settings page or revoke notification permission in your browser settings. Revoking browser permission alone may not immediately remove the server-side subscription; use the settings page when possible.'],
            ['Your Rights (GDPR)','EU residents have the right to access, rectify, erase, restrict, and port their personal data. To exercise these rights, contact privacy@vaultexwallet.io. We respond within 30 days.'],
            ['Security','We use AES-256 encryption at rest, TLS 1.3 in transit, and SOC 2 Type II certified infrastructure. Private keys never leave your device.'],
            ['Cookies','We use essential cookies for authentication and analytics cookies to improve our service. See our Cookie Policy for details.'],
            ['Contact','For privacy inquiries: privacy@vaultexwallet.io · VAULTEX Inc., 1 Raffles Place, Singapore 048616'],
          ].map(([title,body])=>(
            <div key={title as string}>
              <h2 style={{ fontFamily:'Syne,sans-serif',fontWeight:800,fontSize:16,color:'#fff',marginBottom:8,marginTop:24 }}>{title}</h2>
              <p style={{ marginBottom:8 }}>{body}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
