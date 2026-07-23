"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X, History, Pill } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { MedicineDTO } from "@/types";

interface SearchBarProps {
  onSelect: (medicine: MedicineDTO) => void;
  onClear?: () => void;
  selected?: MedicineDTO | null;
}

const RECENT_SEARCHES_KEY = "pharmaconnect_recent_searches";

export default function SearchBar({ onSelect, onClear, selected }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineDTO[]>([]);
  const [recentSearches, setRecentSearches] = useState<MedicineDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load recent searches");
      }
    }
  }, []);

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

  const handleSelect = (medicine: MedicineDTO) => {
    // Add to recent searches
    const updatedRecent = [
      medicine,
      ...recentSearches.filter((m) => m.id !== medicine.id),
    ].slice(0, 5);
    setRecentSearches(updatedRecent);
    localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));

    onSelect(medicine);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-600 transition-colors" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (onClear) onClear();
          }}
          onFocus={() => setOpen(true)}
          placeholder="Search medicine by generic or brand name..."
          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => {
              setQuery("");
              setSuggestions([]);
              onClear?.();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden max-h-[450px] flex flex-col"
          >
            {loading && (
              <div className="px-4 py-4 text-sm text-slate-500 flex items-center gap-2">
                <div className="w-3 h-3 bg-primary-600 rounded-full animate-bounce" />
                Searching medicines...
              </div>
            )}

            {!loading && suggestions.length === 0 && recentSearches.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Pill className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">No medicines found. Try another keyword.</p>
              </div>
            )}

            {!loading && suggestions.length === 0 && recentSearches.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Searches</div>
                <div className="max-h-40 overflow-y-auto">
                  {recentSearches.map((m) => (
                    <button
                      key={`recent-${m.id}`}
                      onClick={() => handleSelect(m)}
                      className="w-full text-left px-4 py-2.5 hover:bg-primary-50 dark:hover:bg-slate-700 flex items-center gap-3 transition-colors group"
                    >
                      <History className="h-4 w-4 text-slate-400 group-hover:text-primary-600" />
                      <span className="text-sm">
                        <span className="font-medium">{m.genericName}</span>
                        <span className="text-slate-500 text-xs ml-1"> {m.brandName}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && suggestions.length > 0 && (
              <div className="py-2">
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Matches</div>
                <div className="max-h-72 overflow-y-auto">
                  {suggestions.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => handleSelect(m)}
                      className="w-full text-left px-4 py-3 hover:bg-primary-50 dark:hover:bg-slate-700 flex items-center justify-between transition-colors group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-1.5 bg-slate-100 dark:bg-slate-700 rounded-lg group-hover:bg-white dark:group-hover:bg-slate-600 transition-colors">
                          <Pill className="h-4 w-4 text-slate-500 group-hover:text-primary-600" />
                        </div>
                        <span className="text-sm">
                          <span className="font-semibold text-slate-900 dark:text-white">{m.genericName}</span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1"> · {m.brandName} {m.strength}</span>
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
