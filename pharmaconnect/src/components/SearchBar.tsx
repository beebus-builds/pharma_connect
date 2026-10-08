"use client";

import { useEffect, useRef, useState, useCallback, type ReactNode } from "react";
import { appToast as toast } from "@/components/Providers";
import { Search, X, History, Pill, Trash2, CornerDownLeft, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/components/LocaleProvider";
import type { MedicineDTO } from "@/types";

interface SearchBarProps {
  onSelect: (medicine: MedicineDTO) => void;
  onClear?: () => void;
  selected?: MedicineDTO | null;
  /** Pre-fills the input (e.g. from a `?q=` deep link). Does not auto-select. */
  initialQuery?: string;
  /** Hint shown under the field when nothing is selected yet. */
  footer?: ReactNode;
}

const RECENT_SEARCHES_KEY = "pharmaconnect_recent_searches";
const MAX_RECENT = 6;

function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded bg-accent-soft px-0.5 text-accent">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/** Thumbnail: real product photo when the catalog has one, monogram otherwise. */
function Thumb({ medicine, active }: { medicine: MedicineDTO; active: boolean }) {
  if (medicine.imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={medicine.imageUrl}
        alt=""
        loading="lazy"
        decoding="async"
        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-line"
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold ring-1 ring-inset transition-colors",
        active
          ? "bg-accent text-accent-fg ring-accent"
          : "bg-surface-sunken text-fg-subtle ring-line"
      )}
    >
      {medicine.genericName.slice(0, 2).toUpperCase()}
    </span>
  );
}

export default function SearchBar({ onSelect, onClear, selected, initialQuery, footer }: SearchBarProps) {
  const { t } = useLocale();
  const [query, setQuery] = useState(initialQuery ?? "");
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
  const queryRef = useRef(initialQuery ?? "");
  // `t` changes identity on every locale switch. Holding it in a ref keeps it out
  // of the search effect's deps so switching language does not re-run the query.
  const tRef = useRef(t);
  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (initialQuery === undefined) return;
    queryRef.current = initialQuery;
    setQuery(initialQuery);
  }, [initialQuery]);

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

  // `/` focuses the search from anywhere on the page — the convention people
  // already carry over from every other search-first product.
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;
      if (target?.isContentEditable) return;
      e.preventDefault();
      inputRef.current?.focus();
      setOpen(true);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
        if (!res.ok) throw new Error(data.error || tRef.current("search.searchFailed"));
        if (!controller.signal.aborted) {
          setSuggestions(data.medicines ?? []);
          setNextCursor(data.pagination?.nextCursor ?? null);
          setHasMore(Boolean(data.pagination?.hasMore));
          setActiveIndex(-1);
          setOpen(true);
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          setSuggestions([]);
          toast.error(err.message || tRef.current("search.searchFailed"));
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 240);

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
      if (!res.ok) throw new Error(data.error || tRef.current("search.loadMoreFailed"));
      if (queryRef.current !== requestedQuery) return;
      setSuggestions((previous) => {
        const existing = new Set(previous.map((medicine) => medicine.id));
        return [
          ...previous,
          ...(data.medicines ?? []).filter(
            (medicine: MedicineDTO) => !existing.has(medicine.id)
          ),
        ];
      });
      setNextCursor(data.pagination?.nextCursor ?? null);
      setHasMore(Boolean(data.pagination?.hasMore));
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : tRef.current("search.loadMoreFailed")
      );
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, nextCursor, query]);

  const handleSelect = useCallback(
    (medicine: MedicineDTO) => {
      const updatedRecent = [
        medicine,
        ...recentSearches.filter((m) => m.id !== medicine.id),
      ].slice(0, MAX_RECENT);
      setRecentSearches(updatedRecent);
      try {
        localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(updatedRecent));
      } catch {
        // private mode: recents are a nicety, not a requirement
      }
      onSelect(medicine);
      setOpen(false);
      setActiveIndex(-1);
      inputRef.current?.blur();
    },
    [onSelect, recentSearches]
  );

  const clearRecent = () => {
    setRecentSearches([]);
    try {
      localStorage.removeItem(RECENT_SEARCHES_KEY);
    } catch {
      // ignore
    }
  };

  const selectedQuery = selected ? `${selected.genericName} (${selected.brandName})` : null;
  const isShowingSuggestions = query.length > 0 && suggestions.length > 0;
  const isShowingRecent =
    !loading && !isShowingSuggestions && recentSearches.length > 0 && query.length === 0;
  const listItems = isShowingSuggestions ? suggestions : isShowingRecent ? recentSearches : [];
  const listId = "search-listbox";
  const activeId =
    activeIndex >= 0 ? `search-option-${listItems[activeIndex]?.id ?? activeIndex}` : undefined;

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
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  };

  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const el = listRef.current.querySelector(`[data-index="${activeIndex}"]`);
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const panelOpen = open && (loading || isShowingSuggestions || isShowingRecent || query.length > 0);

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-fg-subtle transition-colors peer-focus:text-accent"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            queryRef.current = e.target.value;
            setQuery(e.target.value);
            onClear?.();
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={t("search.placeholder")}
          className={cn(
            "peer h-14 w-full rounded-2xl border border-line bg-surface pl-12 text-[0.9375rem] text-fg shadow-card",
            "placeholder:text-fg-subtle",
            "focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15",
            "transition-[box-shadow,border-color] duration-200 motion-reduce:transition-none",
            query ? "pr-24" : "pr-20"
          )}
          role="combobox"
          aria-expanded={panelOpen}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-autocomplete="list"
          aria-label={t("search.label")}
          autoComplete="off"
          spellCheck={false}
          enterKeyHint="search"
        />

        <div className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          {loading && (
            <Loader2
              className="h-4 w-4 animate-spin text-fg-subtle"
              aria-hidden="true"
            />
          )}
          {query ? (
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
              className="flex h-8 w-8 items-center justify-center rounded-lg text-fg-subtle transition-colors hover:bg-surface-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-ring"
              aria-label={t("search.clear")}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          ) : (
            // Keyboard affordance, hidden on touch where there is no "/" key.
            <kbd className="hidden select-none rounded-md border border-line bg-surface-sunken px-1.5 py-0.5 font-sans text-[10px] font-semibold text-fg-subtle sm:block">
              /
            </kbd>
          )}
        </div>
      </div>

      {panelOpen && (
        <div
          className="absolute z-50 mt-2 w-full origin-top overflow-hidden rounded-2xl border border-line bg-surface shadow-overlay animate-scaleIn motion-reduce:animate-none"
          role="region"
          aria-label={t("search.suggestions")}
        >
          {loading && !isShowingSuggestions && (
            <div className="flex items-center gap-2.5 px-4 py-3 text-sm text-fg-muted" aria-live="polite">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {t("search.searching")}
            </div>
          )}

          {!loading && !isShowingSuggestions && !isShowingRecent && (
            <div className="px-4 py-10 text-center">
              <Pill className="mx-auto mb-2.5 h-7 w-7 text-fg-subtle" aria-hidden="true" />
              <p className="text-sm text-fg-muted">
                {query ? t("search.noResults", { query }) : t("search.empty")}
              </p>
            </div>
          )}

          {!loading && isShowingRecent && (
            <div className="py-2" ref={listRef}>
              <div className="flex items-center justify-between px-4 py-2">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                  {t("search.recent")}
                </span>
                <button
                  onClick={clearRecent}
                  className="inline-flex items-center gap-1 rounded px-1 text-[10px] font-semibold text-fg-subtle transition-colors hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/30"
                  aria-label={t("search.clearRecentAria")}
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  {t("search.clear")}
                </button>
              </div>
              <div
                className="max-h-64 overflow-y-auto"
                id={listId}
                role="listbox"
                aria-label={t("search.recentList")}
              >
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
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none",
                      idx === activeIndex ? "bg-accent-soft" : "hover:bg-surface-sunken"
                    )}
                  >
                    <History
                      className="h-4 w-4 shrink-0 text-fg-subtle"
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1 truncate text-sm">
                      <span className="font-medium text-fg">{m.genericName}</span>
                      <span className="ml-1.5 text-xs text-fg-muted">
                        {m.brandName} · {m.strength}
                      </span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {!loading && isShowingSuggestions && (
            <div className="py-2" ref={listRef}>
              <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-[0.12em] text-fg-subtle">
                {t("search.matches", { count: suggestions.length, query })}
              </div>
              <div
                className="max-h-80 overflow-y-auto"
                id={listId}
                role="listbox"
                aria-label={t("search.suggestions")}
              >
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
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors focus-visible:outline-none",
                      idx === activeIndex ? "bg-accent-soft" : "hover:bg-surface-sunken"
                    )}
                  >
                    <Thumb medicine={m} active={idx === activeIndex} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-fg">
                        <Highlight text={m.genericName} query={query} />
                        <span className="ml-1.5 font-normal text-fg-muted">
                          {m.brandName} {m.strength}
                        </span>
                      </span>
                      {m.manufacturer && (
                        <span className="block truncate text-xs text-fg-subtle">
                          {m.manufacturer}
                        </span>
                      )}
                    </span>
                    {idx === activeIndex && (
                      <CornerDownLeft
                        className="h-3.5 w-3.5 shrink-0 text-fg-subtle"
                        aria-hidden="true"
                      />
                    )}
                  </button>
                ))}
              </div>
              {hasMore && nextCursor && (
                <button
                  type="button"
                  onClick={loadMore}
                  disabled={loadingMore}
                  className="w-full border-t border-line px-4 py-3 text-xs font-semibold text-accent transition-colors hover:bg-accent-soft disabled:opacity-60"
                >
                  {loadingMore ? t("search.loadingMore") : t("search.loadMore")}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {footer && !selected && <div className="mt-3">{footer}</div>}

      {/* Screen-reader mirror of the visible field state. */}
      <span className="sr-only" aria-live="polite">
        {selectedQuery ? `${t("search.selected")}: ${selectedQuery}` : ""}
      </span>
    </div>
  );
}
