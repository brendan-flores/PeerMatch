"use client";

import { ChevronDown, CircleDollarSign, ShieldAlert } from "lucide-react";
import {
  FILTER_ALL,
  MAX_POST_BUDGET,
  MIN_POST_BUDGET,
  URGENCY_FILTER_OPTIONS,
  type CommunityPostFeedFilters,
  type TaskUrgencyValue,
} from "@/app/lib/postFilters";

type BrowsePostFiltersProps = {
  value: CommunityPostFeedFilters;
  onChange: (next: CommunityPostFeedFilters) => void;
  className?: string;
};

const selectClassName =
  "h-11 w-full appearance-none rounded-xl border border-zinc-300 bg-white px-3 pr-9 text-sm text-zinc-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30";

const inputClassName =
  "h-11 w-full rounded-xl border border-zinc-300 bg-white px-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#FF6B35]/30";

const labelClassName = "mb-1.5 inline-flex items-center gap-1.5 text-xs font-semibold text-zinc-900";

export function BrowsePostFilters({ value, onChange, className = "" }: BrowsePostFiltersProps) {
  const urgencyValue = value.urgency ?? FILTER_ALL;

  return (
    <div
      className={`grid gap-3 sm:grid-cols-2 ${className}`}
      role="group"
      aria-label="Filter browse posts"
    >
      <div>
        <span className={labelClassName}>
          <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
            <CircleDollarSign className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          Rate (PHP)
        </span>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="browse-filter-rate-from" className="sr-only">
              Rate from
            </label>
            <input
              id="browse-filter-rate-from"
              type="number"
              inputMode="numeric"
              min={MIN_POST_BUDGET}
              max={MAX_POST_BUDGET}
              step={1}
              placeholder="From"
              value={value.rateMin ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  rateMin: event.target.value,
                })
              }
              className={inputClassName}
            />
          </div>
          <div>
            <label htmlFor="browse-filter-rate-to" className="sr-only">
              Rate to
            </label>
            <input
              id="browse-filter-rate-to"
              type="number"
              inputMode="numeric"
              min={MIN_POST_BUDGET}
              max={MAX_POST_BUDGET}
              step={1}
              placeholder="To"
              value={value.rateMax ?? ""}
              onChange={(event) =>
                onChange({
                  ...value,
                  rateMax: event.target.value,
                })
              }
              className={inputClassName}
            />
          </div>
        </div>
        <p className="mt-1 text-[11px] text-zinc-500">
          ₱{MIN_POST_BUDGET.toLocaleString("en-PH")} – ₱{MAX_POST_BUDGET.toLocaleString("en-PH")}
        </p>
      </div>

      <div>
        <label htmlFor="browse-filter-urgency" className={labelClassName}>
          <span className="inline-flex items-center justify-center rounded-md bg-[#FFF2EB] p-1 text-[#FF6B35]">
            <ShieldAlert className="h-3.5 w-3.5" strokeWidth={2} />
          </span>
          Urgency
        </label>
        <div className="relative">
          <select
            id="browse-filter-urgency"
            value={urgencyValue}
            onChange={(event) =>
              onChange({
                ...value,
                urgency: event.target.value as typeof FILTER_ALL | TaskUrgencyValue,
              })
            }
            className={selectClassName}
          >
            {URGENCY_FILTER_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500"
            strokeWidth={2}
          />
        </div>
      </div>
    </div>
  );
}
