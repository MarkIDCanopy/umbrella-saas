// src/components/admin-transactions/AdminTransactionsFilters.tsx
"use client";

import * as React from "react";
import { CalendarIcon, Check } from "lucide-react";
import { format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { serviceRegistry } from "@/lib/services/serviceRegistry";

const ALL_STATUSES = ["OK", "REVIEW", "NOK", "ERROR"] as const;
const ALL_SERVICES = Object.keys(serviceRegistry);

interface Props {
  query: string;
  onQueryChange: (v: string) => void;

  actor: string;
  onActorChange: (v: string) => void;

  statuses: string[];
  onStatusesChange: (v: string[]) => void;

  services: string[];
  onServicesChange: (v: string[]) => void;

  dateRange?: DateRange;
  onDateRangeChange: (r: DateRange | undefined) => void;

  onReset: () => void;
}

function toggle(value: string, list: string[]) {
  return list.includes(value)
    ? list.filter((v) => v !== value)
    : [...list, value];
}

export function AdminTransactionsFilters({
  query,
  onQueryChange,
  actor,
  onActorChange,
  statuses,
  onStatusesChange,
  services,
  onServicesChange,
  dateRange,
  onDateRangeChange,
  onReset,
}: Props) {
  return (
    <div className="space-y-4 overflow-visible rounded-xl border bg-card p-4">
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Input
          placeholder="Search by transaction ID, batch ID, service or organization"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
        />

        <Input
          placeholder="Filter by user name or email"
          value={actor}
          onChange={(e) => onActorChange(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Status</span>
              {statuses.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {statuses.length} selected
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="z-50 min-w-[--radix-popover-trigger-width] max-w-[320px] p-2"
          >
            <div className="space-y-1">
              {ALL_STATUSES.map((s) => {
                const checked = statuses.includes(s);
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => onStatusesChange(toggle(s, statuses))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted",
                      checked && "bg-muted"
                    )}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border">
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-left">{s}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" className="w-full justify-between">
              <span>Service</span>
              {services.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {services.length} selected
                </span>
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent
            align="start"
            sideOffset={8}
            className="z-50 min-w-[--radix-popover-trigger-width] max-w-[320px] p-2"
          >
            <div className="space-y-1 max-h-72 overflow-y-auto">
              {ALL_SERVICES.map((svc) => {
                const checked = services.includes(svc);
                const label = serviceRegistry[svc]?.label ?? svc;

                return (
                  <button
                    key={svc}
                    type="button"
                    onClick={() => onServicesChange(toggle(svc, services))}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm hover:bg-muted",
                      checked && "bg-muted"
                    )}
                  >
                    <span className="flex h-4 w-4 items-center justify-center rounded border">
                      {checked && <Check className="h-3 w-3" />}
                    </span>
                    <span className="flex-1 text-left">{label}</span>
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange?.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "dd MMM yyyy")} –{" "}
                    {format(dateRange.to, "dd MMM yyyy")}
                  </>
                ) : (
                  format(dateRange.from, "dd MMM yyyy")
                )
              ) : (
                "Select date range"
              )}
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={onDateRangeChange}
              numberOfMonths={1}
              initialFocus
            />
          </PopoverContent>
        </Popover>

        <Button
          variant="ghost"
          className="justify-start text-muted-foreground"
          onClick={onReset}
        >
          Reset filters
        </Button>
      </div>
    </div>
  );
}