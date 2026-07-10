import { createContext, useContext, useEffect, useState } from "react";
import { IntlProvider } from "use-intl";
import ja from "@/messages/ja.json";
import en from "@/messages/en.json";
import { defaultLocale, isLocale, type Locale } from "./config";

type Messages = typeof ja;

const MESSAGES: Record<Locale, Messages> = { ja, en };

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

/** Access the current locale and a setter that persists it via IPC. */
export function useLocaleControl(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocaleControl must be used within LocaleProvider");
  return ctx;
}

/**
 * Loads the persisted UI locale from the main process, then provides messages
 * to `use-intl`. Replaces next-intl's server-driven locale resolution.
 */
export function LocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  useEffect(() => {
    let active = true;
    window.api.locale.get().then((stored) => {
      if (active && isLocale(stored)) setLocaleState(stored);
    });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = (next: Locale) => {
    setLocaleState(next);
    window.api.locale.set(next).catch(() => {});
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale }}>
      <IntlProvider locale={locale} messages={MESSAGES[locale]} timeZone="UTC">
        {children}
      </IntlProvider>
    </LocaleContext.Provider>
  );
}
