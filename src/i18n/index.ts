import { createContext, useContext } from "react";
import en, { type Messages } from "./en";
import ja from "./ja";

const locales: Record<string, Messages> = { en, ja };

function detectLocale(): string {
  if (typeof navigator === "undefined") return "en";
  const lang = navigator.language.split("-")[0];
  return lang in locales ? lang : "en";
}

const currentLocale = detectLocale();
const currentMessages = locales[currentLocale] ?? en;

export const I18nContext = createContext<Messages>(currentMessages);

export function useI18n(): Messages {
  return useContext(I18nContext);
}

export function getMessages(): Messages {
  return currentMessages;
}

export function getLocale(): string {
  return currentLocale;
}
