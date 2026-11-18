"use client";

import { useState } from "react";
import type { ColumnSandboxBankAccountSummary } from "@/lib/column";

type AccountResponse = {
  account: ColumnSandboxBankAccountSummary;
};

function isAmountOrNull(value: unknown): value is number | null {
  return value === null || (typeof value === "number" && Number.isSafeInteger(value));
}

function isBalancesSummary(value: unknown): boolean {
  if (value === null) return true;
  if (!value || typeof value !== "object") return false;
  return (
    "availableAmount" in value &&
    isAmountOrNull(value.availableAmount) &&
    "holdingAmount" in value &&
    isAmountOrNull(value.holdingAmount) &&
    "lockedAmount" in value &&
    isAmountOrNull(value.lockedAmount) &&
    "pendingAmount" in value &&
    isAmountOrNull(value.pendingAmount)
  );
}

function isAccountResponse(value: unknown): value is AccountResponse {
  if (!value || typeof value !== "object" || !("account" in value)) return false;
  const account = value.account;
  return Boolean(
    account &&
      typeof account === "object" &&
      "id" in account &&
      typeof account.id === "string" &&
      "description" in account &&
      typeof account.description === "string" &&
      "currencyCode" in account &&
      typeof account.currencyCode === "string" &&
      "status" in account &&
      typeof account.status === "string" &&
      "type" in account &&
      typeof account.type === "string" &&
      "createdAt" in account &&
      typeof account.createdAt === "string" &&
      "balances" in account &&
      isBalancesSummary(account.balances),
  );
}

function formatAmount(amount: number, currencyCode: string) {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: currencyCode,
    });
    const fractionDigits = formatter.resolvedOptions().maximumFractionDigits ?? 2;
    return formatter.format(amount / 10 ** fractionDigits);
  } catch {
    return `${amount} minor units`;
  }
}

export default function ColumnSandboxAccount() {
  const [account, setAccount] = useState<ColumnSandboxBankAccountSummary | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function loadAccount() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/column/account", {
        cache: "no-store",
      });
      const payload: unknown = await response.json();

      if (!response.ok) {
        const message =
          payload && typeof payload === "object" && "error" in payload &&
          typeof payload.error === "string"
            ? payload.error
            : "Unable to load the sandbox account.";
        throw new Error(message);
      }
      if (!isAccountResponse(payload)) {
        throw new Error("Column returned an invalid account response.");
      }

      setAccount(payload.account);
    } catch (reason) {
      setAccount(null);
      setError(
        reason instanceof Error ? reason.message : "Unable to load the sandbox account.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <section
      aria-labelledby="column-sandbox-heading"
      style={{
        margin: "20px 0",
        padding: 18,
        borderRadius: 10,
        border: "1px solid rgba(0,240,255,0.25)",
        background: "rgba(0,240,255,0.04)",
      }}
    >
      <h2 id="column-sandbox-heading" style={{ marginBottom: 8 }}>
        Column sandbox account
      </h2>
      <p style={{ color: "#9DB0C8", marginBottom: 14 }}>
        Test data only. This read-only view does not move money.
      </p>
      <button
        type="button"
        onClick={() => void loadAccount()}
        disabled={loading}
        style={{ padding: "8px 12px", cursor: loading ? "wait" : "pointer" }}
      >
        {loading ? "Loading..." : account ? "Refresh account" : "Load account"}
      </button>
      {error && (
        <p role="alert" style={{ color: "#FF8C42", marginTop: 12 }}>
          {error}
        </p>
      )}
      {account && (
        <dl style={{ display: "grid", gap: 8, marginTop: 16 }}>
          <div><dt>Description</dt><dd>{account.description}</dd></div>
          <div><dt>Status</dt><dd>{account.status}</dd></div>
          <div><dt>Type</dt><dd>{account.type}</dd></div>
          <div><dt>Currency</dt><dd>{account.currencyCode}</dd></div>
          {account.balances?.availableAmount !== null &&
            account.balances?.availableAmount !== undefined && (
              <div>
                <dt>Available balance</dt>
                <dd>{formatAmount(account.balances.availableAmount, account.currencyCode)}</dd>
              </div>
            )}
        </dl>
      )}
    </section>
  );
}
