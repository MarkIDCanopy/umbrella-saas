// src/app/(public)/dashboard/my-services/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useFavorites } from "@/store/useFavorites";
import { ServiceCard } from "@/components/ServiceCard";
import type { Service as UiService } from "@/app/(public)/dashboard/services/data";

export default function MyServicesPage() {
  const { favorites, toggleFavorite } = useFavorites();
  const [services, setServices] = useState<UiService[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch("/api/services");
        if (!res.ok) throw new Error("Failed to load services");
        const data: UiService[] = await res.json();
        if (!cancelled) {
          setServices(data);
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setServices([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const favoriteServices = useMemo(
    () => services.filter((s) => favorites.includes(s.id)),
    [services, favorites]
  );

  return (
    <div className="space-y-10">
      <h1 className="text-3xl font-semibold tracking-tight">My Services</h1>

      {loading && favoriteServices.length === 0 ? (
        <p className="text-muted-foreground">Loading your services…</p>
      ) : favoriteServices.length === 0 ? (
        <p className="text-muted-foreground">
          You haven't added any services yet.
        </p>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {favoriteServices.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isFavorite={true}
              toggleFavorite={toggleFavorite}
            />
          ))}
        </div>
      )}
    </div>
  );
}
