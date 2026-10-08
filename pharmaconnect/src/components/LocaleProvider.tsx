"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  loadLocaleDictionary,
  parseLocale,
  translate,
  type Locale,
  type MessageKey,
} from "@/lib/i18n";

type LocaleContextValue = {
  locale: Locale;
  ready: boolean;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
  t: (key: MessageKey, params?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<LocaleContextValue | undefined>(undefined);

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [ready, setReady] = useState(false);
  // Bumped whenever a new dictionary lands, so `t` picks up the new table.
  const [dictionaryVersion, setDictionaryVersion] = useState(0);

  useEffect(() => {
    const stored = parseLocale(localStorage.getItem(LOCALE_STORAGE_KEY));
    const initial = stored ?? parseLocale(navigator.language) ?? DEFAULT_LOCALE;
    let cancelled = false;
    // Wait for the dictionary before announcing the locale, otherwise the UI
    // renders English for one frame and then snaps to Nepali.
    void loadLocaleDictionary(initial).then(() => {
      if (cancelled) return;
      setLocaleState(initial);
      setDictionaryVersion((v) => v + 1);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.lang = locale;
    localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale, ready]);

  const setLocale = useCallback((next: Locale) => {
    if (next === locale) return;
    void loadLocaleDictionary(next).then(() => {
      setLocaleState(next);
      setDictionaryVersion((v) => v + 1);
    });
  }, [locale]);

  const toggleLocale = useCallback(
    () => setLocale(locale === "en" ? "ne" : "en"),
    [locale, setLocale]
  );

  const t = useCallback(
    (key: MessageKey, params?: Record<string, string | number>) => translate(locale, key, params),
    // `dictionaryVersion` is what makes this callback change identity after a
    // lazy dictionary registers itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale, dictionaryVersion]
  );

  const value = useMemo(
    () => ({ locale, ready, setLocale, toggleLocale, t }),
    [locale, ready, setLocale, toggleLocale, t]
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
