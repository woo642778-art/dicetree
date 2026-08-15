import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { strings, type Locale } from "./strings";

interface I18nValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(() => (localStorage.getItem("dicetree.locale") === "en" ? "en" : "ko"));
  const setLocale = (next: Locale) => {
    localStorage.setItem("dicetree.locale", next);
    document.documentElement.lang = next;
    setLocaleState(next);
  };
  const value = useMemo<I18nValue>(() => ({
    locale,
    setLocale,
    t: (key, vars) => {
      let value = strings[locale][key] ?? strings.ko[key] ?? key;
      for (const [name, replacement] of Object.entries(vars ?? {})) value = value.replaceAll(`{${name}}`, String(replacement));
      return value;
    },
  }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
