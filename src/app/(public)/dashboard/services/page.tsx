// src/app/dashboard/services/page.tsx
"use client";

import { useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { useFavorites } from "@/store/useFavorites";
import { ServiceCard } from "@/components/ServiceCard";
import type { Service as UiService } from "@/app/(public)/dashboard/services/data";

export default function ServicesPage() {
  const [search, setSearch] = useState("");
  const [services, setServices] = useState<UiService[]>([]);
  const [loading, setLoading] = useState(true);

  const { favorites, toggleFavorite } = useFavorites();

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

  const filtered = useMemo(() => {
    if (!search.trim()) return services;

    const q = search.toLowerCase();
    return services.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q) ||
        s.features.some((f) => f.toLowerCase().includes(q))
    );
  }, [search, services]);

  return (
    <div className="space-y-10">
      {/* HEADER */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Services Catalog</h1>
        <p className="text-muted-foreground mt-1">
          Choose from our suite of verification and compliance services.
        </p>
      </div>

      {/* SEARCH BAR */}
      <div className="relative w-full md:w-49/100">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search services..."
          className="pl-10 h-11 rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ALL SERVICES */}
      <div className="grid md:grid-cols-2 gap-6">
        {loading && services.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Loading services…
          </p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No services match your search.
          </p>
        ) : (
          filtered.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              isFavorite={favorites.includes(service.id)}
              toggleFavorite={toggleFavorite}
            />
          ))
        )}
      </div>
    </div>
  );
}
