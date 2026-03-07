// src/lib/pricing/useServiceBasePriceCredits.ts
"use client";

import { useEffect, useState } from "react";

export function useServiceBasePriceCredits(serviceKey: string, fallback: number) {
  const [credits, setCredits] = useState<number>(fallback);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ key: serviceKey });
        const res = await fetch(`/api/pricing/service?${params.toString()}`, {
          cache: "no-store",
        });

        const data = await res.json().catch(() => null);
        if (cancelled) return;

        const c = Number(data?.credits);
        if (res.ok && Number.isFinite(c) && c > 0) {
          setCredits(c);
        } else {
          setCredits(fallback);
        }
      } catch {
        if (!cancelled) setCredits(fallback);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [serviceKey, fallback]);

  return { credits, loading };
}
