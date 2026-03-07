// src/components/transactions/TransactionsPagination.tsx
"use client";

type Props = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (p: number) => void;
  onPageSizeChange: (n: number) => void;
};

export function TransactionsPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: Props) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-wrap items-center justify-between gap-4">
      {/* PAGE SIZE */}
      <select
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
        className="rounded-md border px-2 py-1 text-sm"
      >
        <option value={10}>10 / page</option>
        <option value={25}>25 / page</option>
        <option value={100}>100 / page</option>
      </select>

      {/* PAGES */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i + 1;
          return (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={`rounded-md px-3 py-1 text-sm ${
                p === page
                  ? "bg-black text-white"
                  : "border"
              }`}
            >
              {p}
            </button>
          );
        })}
      </div>
    </div>
  );
}
