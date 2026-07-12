"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MedicineDTO } from "@/types";

interface SearchBarProps {
  onSelect: (medicine: MedicineDTO) => void;
  onClear?: () => void;
  selected?: MedicineDTO | null;
}

export default function SearchBar({ onSelect, onClear, selected }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selected) {
      setQuery(`${selected.genericName} (${selected.brandName})`);
      setOpen(false);
    }
  }, [selected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!query || (selected && query === `${selected.genericName} (${selected.brandName})`)) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(query)}`);
        const data = await res.json();
        setSuggestions(data.medicines ?? []);
        setOpen(true);
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query, selected]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onClear) onClear();
          }}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder="Search medicine by generic or brand name (e.g. Paracetamol)"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              onClear?.();
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (loading || suggestions.length > 0) && (
        <div className="absolute z-30 mt-2 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-72 overflow-y-auto">
          {loading && <div className="px-4 py-3 text-sm text-slate-500">Searching...</div>}
          {!loading &&
            suggestions.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  onSelect(m);
                  setOpen(false);
                }}
                className={cn(
                  "w-full text-left px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-slate-700 flex items-center justify-between"
                )}
              >
                <span>
                  <span className="font-medium">{m.genericName}</span>
                  <span className="text-slate-500"> · {m.brandName} {m.strength}</span>
                </span>
              </button>
            ))}
          {!loading && suggestions.length === 0 && (
            <div className="px-4 py-3 text-sm text-slate-500">No medicines found</div>
          )}
        </div>
      )}
    </div>
  );
}
