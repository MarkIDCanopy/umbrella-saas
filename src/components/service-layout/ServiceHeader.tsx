// src/components/service-layout/ServiceHeader.tsx
"use client";

type ServiceHeaderProps = {
  title: string;
  description: string;
  badge?: string;
};

export function ServiceHeader({ title, description, badge }: ServiceHeaderProps) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {badge && (
          <span className="inline-flex items-center rounded-full border bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
            {badge}
          </span>
        )}
      </div>
      <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      <div className="h-px w-full bg-border/70" />
    </div>
  );
}
