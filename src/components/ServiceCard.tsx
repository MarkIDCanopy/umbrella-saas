// src/components/ServiceCard.tsx
"use client";

import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Star } from "lucide-react";
import type { Service } from "@/app/(public)/dashboard/services/data";
import { cn } from "@/lib/utils";

export function ServiceCard({
  service,
  isFavorite,
  toggleFavorite,
}: {
  service: Service;
  isFavorite: boolean;
  toggleFavorite: (id: string) => void;
}) {
  return (
    <Card className="shadow-sm hover:shadow-md transition">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{service.name}</CardTitle>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => toggleFavorite(service.id)}
            >
            <Star
            className={cn(
                "h-5 w-5 transition-colors",
                isFavorite ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            )}
            />
            </Button>
        </div>

        <div className="text-lg">
          <span className="font-semibold">{service.credits} credits</span>
          <span className="text-muted-foreground"> per check</span>
        </div>

        <p className="text-muted-foreground text-sm mt-1">
          {service.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-1 text-sm text-muted-foreground">
        {service.features.map((f) => (
          <div key={f}>• {f}</div>
        ))}

        <Button asChild className="mt-4 w-full">
          <a href={`/dashboard/services/${service.id}`}>Get Started →</a>
        </Button>
      </CardContent>
    </Card>
  );
}
