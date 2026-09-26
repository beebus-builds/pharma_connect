"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { appToast as toast } from "@/components/Providers";
import { Search, X, History, Pill, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MedicineDTO } from "@/types";

interface SearchBarProps {
  onSelect: (medicine: MedicineDTO) => void;
  onClear?: () => void;
  selected?: MedicineDTO | null;
}

const RECENT_SEARCHES_KEY = "pharmaconnect_recent_searches";

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary-100 dark:bg-primary-900/50 text-primary-700 dark:text-primary-300 px-0.5 rounded">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

export default function SearchBar({ onSelect, onClear, selected }: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<MedicineDTO[]>([]);
  const [recentSearches, setRecentSearches] = useState<MedicineDTO[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const queryRef = useRef("");

  useEffect(() => {
    const saved = localStorage.getItem(RECENT_SEARCHES_KEY);
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch {
        // ignore
      }
    }
  }, []);

  useEffect(() => {
    if (selected) {
      const selectedQuery = `${selected.genericName} (${selected.brandName})`;
      queryRef.current = selectedQuery;
      setQuery(selectedQuery);
      setOpen(false);
      setActiveIndex(-1);
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
    setNextCursor(null);
    setHasMore(false);

    if (!query || (selected && query === `${selected.genericName} (${selected.brandName})`)) {
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query, limit: "15" });
        const res = await fetch(`/api/medicines/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Search failed");
        if (!controller.signal.aborted) {
          setSuggestions(data.medicines ?? []);
          setNextCursor(data.pagination?.nextCursor ?? null);
          setHasMore(Boolean(data.pagination?.hasMore));
          setActiveIndex(-1);
          setOpen(true);
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setSuggestions([]);
          toast.error(err.message || "Search failed");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, selected]);

  const loadMore = useCallback(async () => {
    if (!query || !nextCursor || loadingMore) return;
    const requestedQuery = query;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams({ q: requestedQuery, limit: "15", cursor: nextCursor });
      const res = await fetch(`/api/medicines/search?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Search failed");
      if (queryRef.current !== requestedQuery) return;
      setSuggestions((previous) => {
        const existing = new Set(previous.map((medicine) => medicine.id));
        return [...previous, ...(data.medicines ?? []).filter((medicine: MedicineDTO) => !existing.has(medicine.id))];
      });
      setNextCursor(data.pagination?.nextCursor ?? null);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch (err: any) {
      toast.error(err.message || "Could not load more medicines");
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, query]);

  const handleSelect = useCallback(
    (medicine: MedicineDTO) => {
      const updatedRecent = [medicine, ...recentSearches.filter((m) => m.id !== medicine.id)].slice(0, 5);
      setRecentSearches(updatedRecent);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
      onSelect(medicine);
      setOpen(false);
      setActiveIndex(-1);
    },
    [onSelect, recentSearches]
  );

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem(RECENT_SEARCHES_KEY);
  };

  const isShowingSuggestions = query.length > 0 && suggestions.length > 0;
  const isShowingRecent = !loading && !isShowingSuggestions && recentSearches.length > 0 && query.length === 0;
  const listItems = isShowingSuggestions ? suggestions : isShowingRecent ? recentSearches : [];
  const listId = "search-listbox";
  const activeId = activeIndex >= 0 ? `search-option-${listItems[activeIndex]?.id ?? activeIndex}` : undefined;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) {
      if (e.key === "ArrowDown") {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % Math.max(listItems.length, 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + listItems.length) % listItems.length);
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && listItems[activeIndex]) {
        e.preventDefault();
        handleSelect(listItems[activeIndex]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative group">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-primary-600 transition-colors pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
           onChange={(e) => {
             queryRef.current = e.target.value;
             setQuery(e.target.value);
            if (onClear) onClear();
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search medicine by generic or brand name..."
          className="w-full pl-12 pr-12 py-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-sm focus:outline-none focus:ring-4 focus:ring-primary-500/10 focus:border-primary-500 transition-all duration-200 placeholder:text-slate-400"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label="Search medicine"
          autoComplete="off"
          spellCheck={false}
        />
        {query && (
          <button
            type="button"
             onClick={() => {
               queryRef.current = "";
               setQuery("");
              setSuggestions([]);
              setActiveIndex(-1);
              onClear?.();
              inputRef.current?.focus();
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500/30"
            aria-label="Clear search"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

        {open && (
          <div
            className="absolute z-50 mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl overflow-hidden max-h-[460px] flex flex-col animate-slideUp motion-reduce:animate-none"
            role="region"
            aria-label="Search suggestions"
          >
            {loading && (
              <div className="px-4 py-4 text-sm text-slate-500 flex items-center gap-3">
                <div className="w-4 h-4 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                <span aria-live="polite">Searching medicines…</span>
              </div>
            )}

            {!loading && !isShowingSuggestions && !isShowingRecent && (
              <div className="px-4 py-8 text-center">
                <Pill className="h-8 w-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                <p className="text-sm text-slate-500">
                  {query ? `No medicines found for “${query}”. Try another keyword.` : "Start typing to search medicines."}
                </p>
              </div>
            )}

            {!loading && isShowingRecent && (
              <div className="py-2" ref={listRef}>
                <div className="px-4 py-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Recent Searches</span>
                  <button
                    onClick={clearRecent}
                    className="text-[10px] font-semibold text-slate-400 hover:text-red-500 flex items-center gap-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20 rounded px-1"
                    aria-label="Clear recent searches"
                  >
                    <Trash2 className="h-3 w-3" /> Clear
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto" id={listId} role="listbox" aria-label="Recent searches">
                  {recentSearches.map((m, idx) => (
                    <button
                      key={`recent-${m.id}`}
                      data-index={idx}
                      id={`search-option-${m.id}`}
                      role="option"
                      aria-selected={idx === activeIndex}
                      onClick={() => handleSelect(m)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full text-left px-4 py-2.5 flex items-center gap-3 transition-colors group focus-visible:outline-none",
                        idx === activeIndex
                          ? "bg-primary-50 dark:bg-slate-700 text-primary-700 dark:text-white"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <History className="h-4 w-4 text-slate-400 group-hover:text-primary-600 shrink-0" aria-hidden="true" />
                      <span className="text-sm truncate">
                        <span className="font-medium">{m.genericName}</span>
                        <span className="text-slate-500 text-xs ml-1.5">{m.brandName} · {m.strength}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!loading && isShowingSuggestions && (
              <div className="py-2" ref={listRef}>
                <div className="px-4 py-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {suggestions.length} {suggestions.length === 1 ? "Match" : "Matches"} for “{query}”
                </div>
                <div className="max-h-72 overflow-y-auto" id={listId} role="listbox" aria-label="Medicine suggestions">
                  {suggestions.map((m, idx) => (
                    <button
                      key={m.id}
                      data-index={idx}
                      id={`search-option-${m.id}`}
                      role="option"
                      aria-selected={idx === activeIndex}
                      onClick={() => handleSelect(m)}
                      onMouseEnter={() => setActiveIndex(idx)}
                      className={cn(
                        "w-full text-left px-4 py-3 flex items-center justify-between transition-colors group focus-visible:outline-none",
                        idx === activeIndex
                          ? "bg-primary-50 dark:bg-slate-700"
                          : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "p-1.5 rounded-lg shrink-0 transition-colors",
                            idx === activeIndex
                              ? "bg-white dark:bg-slate-600 text-primary-600"
                              : "bg-slate-100 dark:bg-slate-700 text-slate-500 group-hover:bg-white"
                          )}
                          aria-hidden="true"
                        >
                          <Pill className="h-4 w-4" />
                        </div>
                        <span className="text-sm truncate">
                          <span className="font-semibold text-slate-900 dark:text-white">
                            <Highlight text={m.genericName} query={query} />
                          </span>
                          <span className="text-slate-500 dark:text-slate-400 ml-1.5">· {m.brandName} {m.strength}</span>
                        </span>
                      </div>
                      <span className="text-xs text-slate-400 ml-2 hidden sm:inline">{m.genericName.slice(0, 1).toUpperCase()}</span>
                    </button>
                  ))}
                </div>
                {hasMore && nextCursor && (
                  <button
                    type="button"
                    onClick={loadMore}
                    disabled={loadingMore}
                    className="w-full border-t border-slate-100 dark:border-slate-700 px-4 py-3 text-xs font-semibold text-primary-600 hover:bg-primary-50 dark:hover:bg-slate-800 disabled:opacity-60"
                  >
                    {loadingMore ? "Loading more…" : "Show more medicines"}
                  </button>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
}
