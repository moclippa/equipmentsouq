import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { defaultLocale, locales, type Locale } from "./config";

export default getRequestConfig(async () => {
  // Try to get locale from cookie first
  const cookieStore = await cookies();
  let locale = cookieStore.get("locale")?.value as Locale | undefined;

  // Fallback to Accept-Language header
  if (!locale || !locales.includes(locale)) {
    const headerStore = await headers();
    const acceptLanguage = headerStore.get("accept-language");
    if (acceptLanguage) {
      const preferredLocale = acceptLanguage
        .split(",")
        .map((lang) => lang.split(";")[0].trim().split("-")[0])
        .find((lang) => locales.includes(lang as Locale));
      locale = (preferredLocale as Locale) || defaultLocale;
    } else {
      locale = defaultLocale;
    }
  }

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
  };
});
