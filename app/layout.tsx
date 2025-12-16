import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import CustomToaster from "@/components/CustomToaster";
import CookieConsent from "@/components/CookieConsent";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://quoteswipe.com';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "QuoteSwipe - Discover Inspirational Quotes Daily",
    template: "%s | QuoteSwipe",
  },
  description: "Swipe through thousands of handpicked inspirational quotes from history's greatest minds. Save your favorites, share wisdom, and find daily motivation. Free quote discovery app.",
  keywords: [
    // Primary keywords
    "inspirational quotes",
    "motivational quotes",
    "daily quotes",
    "quote app",
    "quote swipe",
    "quote discovery",
    // Quote types
    "wisdom quotes",
    "life quotes",
    "success quotes",
    "love quotes",
    "happiness quotes",
    "positive quotes",
    "mindfulness quotes",
    "self improvement quotes",
    "famous quotes",
    "deep quotes",
    "powerful quotes",
    "meaningful quotes",
    // Authors & sources
    "quotes by famous people",
    "celebrity quotes",
    "historical quotes",
    "book quotes",
    "movie quotes",
    "bible quotes",
    "buddhist quotes",
    "stoic quotes",
    "marcus aurelius quotes",
    "einstein quotes",
    "gandhi quotes",
    // Use cases
    "morning motivation",
    "daily inspiration",
    "quotes for instagram",
    "shareable quotes",
    "quote images",
    "quote wallpaper",
    "quote of the day",
    "best quotes",
    "top quotes",
    "short quotes",
    "long quotes",
    // App-related
    "quote collection app",
    "save quotes",
    "bookmark quotes",
    "quote organizer",
    "free quotes app",
    "quotes online",
    "read quotes",
    "browse quotes",
    // All 133 Categories as keywords
    "inspiration quotes",
    "life quotes",
    "dreams quotes",
    "wisdom quotes",
    "authenticity quotes",
    "action quotes",
    "motivation quotes",
    "success quotes",
    "achievement quotes",
    "ambition quotes",
    "determination quotes",
    "mindfulness quotes",
    "philosophy quotes",
    "purpose quotes",
    "experience quotes",
    "perspective quotes",
    "knowledge quotes",
    "intelligence quotes",
    "insight quotes",
    "learning quotes",
    "truth quotes",
    "love quotes",
    "relationships quotes",
    "family quotes",
    "friendship quotes",
    "romance quotes",
    "connection quotes",
    "happiness quotes",
    "positivity quotes",
    "joy quotes",
    "peace quotes",
    "gratitude quotes",
    "contentment quotes",
    "growth quotes",
    "self-improvement quotes",
    "transformation quotes",
    "strength quotes",
    "goals quotes",
    "courage quotes",
    "aspirations quotes",
    "creativity quotes",
    "vision quotes",
    "hope quotes",
    "future quotes",
    "career quotes",
    "business quotes",
    "wealth quotes",
    "leadership quotes",
    "excellence quotes",
    "professionalism quotes",
    "change quotes",
    "hustle quotes",
    "time quotes",
    "beginnings quotes",
    "momentum quotes",
    "integrity quotes",
    "honesty quotes",
    "resilience quotes",
    "character quotes",
    "identity quotes",
    "challenges quotes",
    "perseverance quotes",
    "adversity quotes",
    "struggle quotes",
    "failure quotes",
    "recovery quotes",
    "mindset quotes",
    "confidence quotes",
    "focus quotes",
    "optimism quotes",
    "thinking quotes",
    "belief quotes",
    "nature quotes",
    "beauty quotes",
    "earth quotes",
    "simplicity quotes",
    "serenity quotes",
    "adventure quotes",
    "patience quotes",
    "today quotes",
    "seasons quotes",
    "art quotes",
    "writing quotes",
    "expression quotes",
    "music quotes",
    "imagination quotes",
    "innovation quotes",
    "wellness quotes",
    "fitness quotes",
    "mental health quotes",
    "health quotes",
    "balance quotes",
    "rest quotes",
    "humor quotes",
    "sarcasm quotes",
    "fun quotes",
    "witty quotes",
    "playful quotes",
    "laughter quotes",
    "spirituality quotes",
    "faith quotes",
    "religion quotes",
    "divine quotes",
    "prayer quotes",
    "education quotes",
    "science quotes",
    "books quotes",
    "discovery quotes",
    "humanity quotes",
    "society quotes",
    "justice quotes",
    "equality quotes",
    "community quotes",
    "technology quotes",
    "progress quotes",
    "digital quotes",
    "modern quotes",
    "food quotes",
    "coffee quotes",
    "wine quotes",
    "dessert quotes",
    "cooking quotes",
    "dining quotes",
    "travel quotes",
    "exploration quotes",
    "wanderlust quotes",
    "journey quotes",
    "birthday quotes",
    "graduation quotes",
    "wedding quotes",
    "holiday quotes",
    "celebration quotes",
    "new year quotes",
  ],
  authors: [{ name: "QuoteSwipe Team", url: siteUrl }],
  creator: "QuoteSwipe",
  publisher: "QuoteSwipe",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/logo.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    shortcut: "/logo.svg",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    siteName: "QuoteSwipe",
    title: "QuoteSwipe - Discover Inspirational Quotes Daily",
    description: "Swipe through thousands of inspirational quotes from history's greatest minds. Save your favorites, share wisdom, and find daily motivation.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "QuoteSwipe - Discover Inspirational Quotes",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "QuoteSwipe - Discover Inspirational Quotes Daily",
    description: "Swipe through thousands of inspirational quotes. Save your favorites and share wisdom.",
    images: ["/og-image.png"],
    creator: "@quoteswipe",
  },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },
  category: "Lifestyle",
  classification: "Inspirational Quotes Application",
  referrer: "origin-when-cross-origin",
  verification: {
    // Add your verification codes here
    // google: "your-google-verification-code",
    // yandex: "your-yandex-verification-code",
    // bing: "your-bing-verification-code",
  },
  other: {
    "msapplication-TileColor": "#3B82F6",
    "theme-color": "#3B82F6",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8FAFC" },
    { media: "(prefers-color-scheme: dark)", color: "#0F172A" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "QuoteSwipe",
  description: "Swipe through thousands of inspirational quotes from history's greatest minds. Save your favorites and share wisdom.",
  url: siteUrl,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  aggregateRating: {
    "@type": "AggregateRating",
    ratingValue: "4.8",
    ratingCount: "1250",
    bestRating: "5",
    worstRating: "1",
  },
  author: {
    "@type": "Organization",
    name: "QuoteSwipe",
    url: siteUrl,
  },
  publisher: {
    "@type": "Organization",
    name: "QuoteSwipe",
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.svg`,
    },
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "QuoteSwipe",
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description: "A platform for discovering and sharing inspirational quotes",
  sameAs: [
    "https://twitter.com/quoteswipe",
    "https://www.instagram.com/quote_swipe/",
    "https://facebook.com/quoteswipe",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "hello.quoteswipe@gmail.com",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${playfairDisplay.variable} antialiased`}
      >
        <ThemeProvider>
          <LanguageProvider>
            <CustomToaster />
            {children}
            <CookieConsent />
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
