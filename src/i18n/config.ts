export const locales = ["en", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export const localeNames: Record<Locale, string> = {
  en: "English",
  ar: "العربية",
};

// RTL languages
export const rtlLocales: Locale[] = ["ar"];

export function isRTL(locale: Locale): boolean {
  return rtlLocales.includes(locale);
}

// Country to default locale mapping
export const countryLocales: Record<string, Locale> = {
  SA: "ar",
  BH: "ar",
};

// Currency formatting
export const currencyConfig = {
  SAR: {
    code: "SAR",
    symbol: "ر.س",
    nameEn: "Saudi Riyal",
    nameAr: "ريال سعودي",
    decimals: 2,
  },
  BHD: {
    code: "BHD",
    symbol: "د.ب",
    nameEn: "Bahraini Dinar",
    nameAr: "دينار بحريني",
    decimals: 3,
  },
};
