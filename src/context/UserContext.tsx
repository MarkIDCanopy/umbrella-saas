"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useFavorites } from "@/store/useFavorites";

export type User = {
  id: number;
  email: string;
  full_name: string | null;
  country: string | null;
  twofa_enabled: boolean;
};

type BillingContextKind = "personal" | "org";

type OrgSummary = {
  id: number;
  name: string;
  orgUid: string | null;
};

type CreditsState = {
  balance: number | null;
  walletId: number | null;
  context: BillingContextKind | null;
  organization: OrgSummary | null;
  creditsLoading: boolean;
};

type UserContextType = {
  user: User | null;
  loading: boolean;

  credits: number | null;
  walletId: number | null;
  billingContext: BillingContextKind | null;
  organization: OrgSummary | null;
  creditsLoading: boolean;

  refreshUser: () => Promise<void>;
  refreshCredits: () => Promise<void>;
  applyCreditsDeltaOptimistic: (delta: number) => void;

  logout: () => Promise<void>;
};

const UserContext = createContext<UserContextType | undefined>(undefined);

// ✅ Accept both snake_case and camelCase user payloads.
function normalizeUser(raw: any): User | null {
  if (!raw) return null;

  const id = Number(raw.id);
  if (!Number.isFinite(id)) return null;

  const email = String(raw.email ?? "").trim();
  if (!email) return null;

  const full_name =
    raw.full_name ?? raw.fullName ?? raw.fullname ?? raw.name ?? null;

  const country = raw.country ?? null;

  const twofa_enabled =
    raw.twofa_enabled ??
    raw.twofaEnabled ??
    raw.twoFAEnabled ??
    raw.twofa ??
    false;

  return {
    id,
    email,
    full_name: full_name == null ? null : String(full_name),
    country: country == null ? null : String(country),
    twofa_enabled: Boolean(twofa_enabled),
  };
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [creditsState, setCreditsState] = useState<CreditsState>({
    balance: null,
    walletId: null,
    context: null,
    organization: null,
    creditsLoading: true,
  });

  async function refreshCredits() {
    setCreditsState((s) => ({ ...s, creditsLoading: true }));
    try {
      const res = await fetch("/api/billing/summary", { cache: "no-store" });

      if (!res.ok) {
        setCreditsState({
          balance: null,
          walletId: null,
          context: null,
          organization: null,
          creditsLoading: false,
        });
        return;
      }

      const data = await res.json();

      setCreditsState({
        balance: typeof data.balance === "number" ? data.balance : 0,
        walletId: typeof data.walletId === "number" ? data.walletId : null,
        context: data.context === "org" ? "org" : "personal",
        organization: data.organization ?? null,
        creditsLoading: false,
      });
    } catch (e) {
      console.error("Failed to refresh credits", e);
      setCreditsState((s) => ({ ...s, creditsLoading: false }));
    }
  }

  function applyCreditsDeltaOptimistic(delta: number) {
    setCreditsState((s) => ({
      ...s,
      balance: typeof s.balance === "number" ? s.balance + delta : s.balance,
    }));
  }

  async function refreshUser() {
    try {
      const res = await fetch("/api/me", { cache: "no-store" });

      if (!res.ok) {
        setUser(null);
        useFavorites.getState().resetFavorites();

        setCreditsState({
          balance: null,
          walletId: null,
          context: null,
          organization: null,
          creditsLoading: false,
        });

        return;
      }

      const data = await res.json().catch(() => ({}));
      const nextUser = data.user ?? null;
      if (nextUser) {
        setUser({
          id: Number(nextUser.id),
          email: String(nextUser.email),
          full_name: nextUser.full_name ?? null,
          country: nextUser.country ?? null,
          twofa_enabled: Boolean(nextUser.twofa_enabled),
        });
      } else {
        setUser(null);
      }


      if (nextUser) {
        await useFavorites.getState().loadFavorites();
        await refreshCredits(); // keep credits consistent when logged in
      } else {
        useFavorites.getState().resetFavorites();
        setCreditsState({
          balance: null,
          walletId: null,
          context: null,
          organization: null,
          creditsLoading: false,
        });
      }
    } catch (e) {
      console.error("Failed to refresh user", e);
      setUser(null);
      useFavorites.getState().resetFavorites();
      setCreditsState({
        balance: null,
        walletId: null,
        context: null,
        organization: null,
        creditsLoading: false,
      });
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });

    setUser(null);
    useFavorites.getState().resetFavorites();

    setCreditsState({
      balance: null,
      walletId: null,
      context: null,
      organization: null,
      creditsLoading: false,
    });

    window.location.assign("/login");
  }

  useEffect(() => {
    refreshUser();
  }, []);

  useEffect(() => {
    const onFocus = () => {
      if (user) refreshCredits();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  return (
    <UserContext.Provider
      value={{
        user,
        loading,

        credits: creditsState.balance,
        walletId: creditsState.walletId,
        billingContext: creditsState.context,
        organization: creditsState.organization,
        creditsLoading: creditsState.creditsLoading,

        refreshUser,
        refreshCredits,
        applyCreditsDeltaOptimistic,

        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const ctx = useContext(UserContext);
  if (!ctx) throw new Error("useUser must be used inside UserProvider");
  return ctx;
}
