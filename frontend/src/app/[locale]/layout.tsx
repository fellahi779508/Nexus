import { NextIntlClientProvider, hasLocale } from "next-intl";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import SideBar from "@/components/sidebar/side-bar";
import "./globals.css";
import ThemeScript from "@/components/themeScript";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export default async function LocaleLayout({ children, params }: Props) {
  // Ensure that the incoming `locale` is valid
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  return (
    <html lang={locale}>
      <NextIntlClientProvider locale={locale}>
        <body style={{ display: "flex", minHeight: "100vh" }}>
          <ThemeScript />
          <SideBar />
          <main style={{ flex: 1 }}>{children}</main>
        </body>
      </NextIntlClientProvider>
    </html>
  );
}
