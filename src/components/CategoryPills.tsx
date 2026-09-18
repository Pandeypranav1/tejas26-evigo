"use client";

import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";

export function CategoryPills({
  value,
  onChange,
}: {
  value: ServiceCategory | "All";
  onChange: (value: ServiceCategory | "All") => void;
}) {
  const items: (ServiceCategory | "All")[] = ["All", ...SERVICE_CATEGORIES];
  return (
    <div className="flex flex-wrap gap-2">
      {items.map((c) => {
        const active = c === value;
        return (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={`rounded-full border px-3 py-1 text-sm font-semibold transition ${
              active
                ? "border-zinc-900 bg-zinc-900 text-white"
                : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
            }`}
          >
            {c}
          </button>
        );
      })}
    </div>
  );
}

