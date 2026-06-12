"use client";

import { useEffect, useState } from "react";
import { NextIntlClientProvider } from "next-intl";
import { usePathname, useRouter } from "next/navigation";

const defaultLocale = "en";
const locales = ["en", "fr", "ar"];

async function loadMessages(locale: string) {
  try {
    const messages = await import(`../../messages/${locale}.json`);
    return messages.default;
  } catch (error) {
    console.error(`Failed to load messages for ${locale}`, error);
    return {};
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState(defaultLocale);
  const [messages, setMessages] = useState({});
  const [isLoaded, setIsLoaded] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  // Load locale from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("app-locale");
    if (saved && locales.includes(saved)) {
      setLocale(saved);
    } else {
      // Optional: detect browser language
      const browserLang = navigator.language.split("-")[0];
      if (locales.includes(browserLang)) {
        setLocale(browserLang);
        localStorage.setItem("app-locale", browserLang);
      }
    }
  }, []);

  // Load messages when locale changes
  useEffect(() => {
    if (locale) {
      loadMessages(locale).then((msgs) => {
        setMessages(msgs);
        setIsLoaded(true);
      });
    }
  }, [locale]);

  // Function to change language (expose via context if needed)
  const changeLocale = (newLocale: string) => {
    if (locales.includes(newLocale)) {
      setLocale(newLocale);
      localStorage.setItem("app-locale", newLocale);
      // Force a refresh of the page to re-render all content with new locale
      router.refresh();
    }
  };

  if (!isLoaded) {
    // Optionally show a loading spinner
    return <div>Loading...</div>;
  }

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      {children}
      {/* You can add a language switcher component here or anywhere */}
    </NextIntlClientProvider>
  );
}
