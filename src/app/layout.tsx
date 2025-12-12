import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { Toaster } from "@/components/ui/sonner";
import { SessionProvider } from "@/components/providers/session-provider";
import { ServiceWorkerProvider } from "@/components/providers/service-worker-provider";
import { OrganizationSchema, WebsiteSchema } from "@/components/seo/structured-data";
import { isRTL, type Locale } from "@/i18n/config";
import "./globals.css";

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://equipmentsouq.com";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: "EquipmentSouq - Heavy Equipment Rental & Sale in Saudi Arabia & Bahrain",
    template: "%s | EquipmentSouq",
  },
  description:
    "Find and rent heavy equipment directly from owners in Saudi Arabia and Bahrain. Excavators, cranes, loaders, bulldozers and more. Free listings, direct contact, no middleman.",
  keywords: [
    "heavy equipment rental",
    "heavy equipment sale",
    "construction equipment",
    "excavator rental",
    "crane rental",
    "loader rental",
    "bulldozer rental",
    "forklift rental",
    "generator rental",
    "Saudi Arabia",
    "Bahrain",
    "KSA",
    "equipment marketplace",
    "equipment classifieds",
    "تأجير معدات ثقيلة",
    "بيع معدات ثقيلة",
    "معدات بناء",
    "حفارات للإيجار",
    "رافعات للإيجار",
  ],
  authors: [{ name: "EquipmentSouq" }],
  creator: "EquipmentSouq",
  publisher: "EquipmentSouq",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    alternateLocale: "ar_SA",
    url: BASE_URL,
    siteName: "EquipmentSouq",
    title: "EquipmentSouq - Heavy Equipment Rental & Sale",
    description:
      "Find and rent heavy equipment directly from owners in Saudi Arabia and Bahrain. Free listings, direct contact.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "EquipmentSouq - Heavy Equipment Marketplace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "EquipmentSouq - Heavy Equipment Rental & Sale",
    description:
      "Find and rent heavy equipment directly from owners in Saudi Arabia and Bahrain.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
    languages: {
      "en-US": `${BASE_URL}/en`,
      "ar-SA": `${BASE_URL}/ar`,
    },
  },
  verification: {
    // Add these when you have them
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
  },
  category: "business",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = (await getLocale()) as Locale;
  const messages = await getMessages();
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <OrganizationSchema />
        <WebsiteSchema />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        {/* Skip navigation link for keyboard users */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:z-[100] focus:top-4 focus:start-4 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
        >
          Skip to main content
        </a>
        <SessionProvider>
          <ServiceWorkerProvider>
            <NextIntlClientProvider messages={messages}>
              {children}
              <Toaster position={dir === "rtl" ? "top-left" : "top-right"} />
            </NextIntlClientProvider>
          </ServiceWorkerProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
