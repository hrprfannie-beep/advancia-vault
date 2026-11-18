import { redirect } from "next/navigation";
import Link from "next/link";
import { getSessionClient } from "@/lib/supabase/server";
import { getSupabaseConfigErrorMessage } from "@/lib/supabase/config";
import { getRuntimeConfigStatus } from "@/lib/env";
import WalletAddressQr from "@/components/WalletAddressQr";
import BitcoinWalletConnect from "@/components/BitcoinWalletConnect";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  let supabase;

  try {
    supabase = await getSessionClient();
  } catch (error) {
    redirect(`/login?error=${encodeURIComponent(getSupabaseConfigErrorMessage(error))}`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const status = getRuntimeConfigStatus();
  const readinessMessage = status.financialServicesEnabled
    ? "Financial services are intentionally disabled by the feature gate."
    : status.ok
      ? "Production readiness: complete for the current pre-live configuration."
      : "Authentication is not fully configured for production use.";

  return (
    <main style={{ padding: 24 }}>
      <h1>Dashboard</h1>
      <p>Signed in as {user.email}</p>
      <div
        style={{
          margin: "12px 0 20px",
          padding: "12px 16px",
          borderRadius: 10,
          border: "1px solid rgba(0,240,255,0.35)",
          background: status.ok ? "rgba(0,240,255,0.08)" : "rgba(255,140,66,0.08)",
          color: "#E2EAF5",
        }}
      >
        {readinessMessage}
      </div>
      <p style={{ marginBottom: 16 }}>
        <Link href="/notifications">Manage notification settings</Link>
      </p>
      <BitcoinWalletConnect />
      <WalletAddressQr />
    </main>
  );
}
