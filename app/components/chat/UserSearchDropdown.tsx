"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { UserSearchResult } from "@/app/lib/chat";
import { searchUsersByQuery } from "@/app/lib/chat";

type Props = {
  query: string;
  onQueryChange: (next: string) => void;
  selectedUserId?: string;
  onSelectUser: (user: UserSearchResult) => void;
  placeholder?: string;
};

export function UserSearchDropdown({
  query,
  onQueryChange,
  selectedUserId,
  onSelectUser,
  placeholder = "Type full/partial name or ObjectId…",
}: Props) {
  const [results, setResults] = useState<UserSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  const queryTrimmed = useMemo(() => String(query || "").trim(), [query]);

  useEffect(() => {
    const onPointerDown = (e: PointerEvent) => {
      if (!wrapRef.current) return;
      if (wrapRef.current.contains(e.target as Node)) return;
      setOpen(false);
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
    if (!queryTrimmed) {
      setResults([]);
      setError(null);
      setLoading(false);
      setOpen(false);
      return;
    }

    let cancelled = false;
    const localQuery = queryTrimmed;
    setLoading(true);
    setError(null);

    const t = window.setTimeout(async () => {
      try {
        const users = await searchUsersByQuery(localQuery);
        if (cancelled) return;
        setResults(users);
        setOpen(true);
      } catch {
        if (cancelled) return;
        setError("Could not search users.");
        setResults([]);
        setOpen(true);
      } finally {
        if (cancelled) return;
        setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [queryTrimmed]);

  return (
    <div ref={wrapRef} className="relative">
      <label className="block text-sm font-medium text-zinc-700">
        Search by name / ID
        <div className="relative mt-1.5">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400"
            strokeWidth={1.8}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className="h-11 w-full rounded-xl border border-zinc-200 bg-white pl-9 pr-3 text-sm text-zinc-900 outline-none focus:border-[#4DD2AC] focus:ring-2 focus:ring-[#4DD2AC]/25"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </label>

      {open ? (
        <div className="absolute z-10 mt-2 w-full overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          {loading ? <div className="p-3 text-sm text-zinc-500">Searching…</div> : null}
          {error ? <div className="p-3 text-sm text-red-600">{error}</div> : null}
          {!loading && !error && results.length === 0 ? (
            <div className="p-3 text-sm text-zinc-500">No users found.</div>
          ) : null}

          {results.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto p-1">
              {results.map((u) => {
                const active = selectedUserId && u.id === selectedUserId;
                return (
                  <li key={u.id}>
                    <button
                      type="button"
                      onClick={() => {
                        onSelectUser(u);
                        setOpen(false);
                      }}
                      className={`flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left transition ${
                        active ? "bg-[#FFF2EB]" : "hover:bg-zinc-50"
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-zinc-900">{u.name}</div>
                      </div>
                      {active ? <span className="text-xs font-semibold text-[#FF6B35]">Selected</span> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

