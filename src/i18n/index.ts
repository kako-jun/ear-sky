import { createContext, useContext, useState, useCallback, useMemo } from "react";
import en, { type Messages } from "./en";
import ja from "./ja";

const locales: Record<string, Messages> = { en, ja };
const STORAGE_KEY = "ear-sky-locale";

function detectLocale(): string {
  // Check localStorage first
  if (typeof localStorage !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && saved in locales) return saved;
  }
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.split("-")[0];
  return lang in locales ? lang : "en";
}

export interface I18nState {
  messages: Messages;
  locale: string;
  setLocale: (locale: string) => void;
  availableLocales: { code: string; label: string }[];
}

const AVAILABLE_LOCALES = [
  { code: "en", label: "EN" },
  { code: "ja", label: "JA" },
];

const defaultLocale = detectLocale();

export const I18nContext = createContext<I18nState>({
  messages: locales[defaultLocale] ?? en,
  locale: defaultLocale,
  setLocale: () => {},
  availableLocales: AVAILABLE_LOCALES,
});

export function useI18n(): Messages {
  return useContext(I18nContext).messages;
}

export function useI18nState(): I18nState {
  return useContext(I18nContext);
}

export function useI18nProvider(): I18nState {
  const [locale, setLocaleState] = useState(defaultLocale);

  const setLocale = useCallback((code: string) => {
    if (code in locales) {
      setLocaleState(code);
      localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const state = useMemo<I18nState>(() => ({
    messages: locales[locale] ?? en,
    locale,
    setLocale,
    availableLocales: AVAILABLE_LOCALES,
  }), [locale, setLocale]);

  return state;
}

export function getMessages(): Messages {
  return locales[detectLocale()] ?? en;
}

export function getLocale(): string {
  return detectLocale();
}
