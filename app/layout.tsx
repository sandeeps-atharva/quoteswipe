import type { Metadata, Viewport } from "next";
import { 
  Geist, 
  Geist_Mono, 
  Playfair_Display,
  Merriweather,
  Lora,
  Crimson_Text,
  Cormorant_Garamond,
  Roboto,
  Open_Sans,
  Lato,
  Poppins,
  Montserrat,
  Inter,
  Nunito,
  Raleway,
  Source_Sans_3,
  Dancing_Script,
  Pacifico,
  Great_Vibes,
  Sacramento,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { BackgroundsProvider } from "@/contexts/BackgroundsContext";
import { UserProvider } from "@/contexts/UserContext";
import CustomToaster from "@/components/CustomToaster";
import CookieConsent from "@/components/CookieConsent";
import InstallAppModal from "@/components/InstallAppModal";

// System fonts - display: 'swap' shows text immediately with fallback fonts
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: 'swap',
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: 'swap',
});

// Serif fonts (Elegant)
const playfairDisplay = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const crimsonText = Crimson_Text({
  variable: "--font-crimson",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const cormorantGaramond = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

// Sans-serif fonts (Modern)
const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin"],
  weight: ["300", "400", "500", "700"],
  display: 'swap',
});

const openSans = Open_Sans({
  variable: "--font-opensans",
  subsets: ["latin"],
  weight: ["300", "400", "600", "700"],
  display: 'swap',
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  weight: ["300", "400", "700"],
  display: 'swap',
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: 'swap',
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: 'swap',
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
  display: 'swap',
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: 'swap',
});

const raleway = Raleway({
  variable: "--font-raleway",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: 'swap',
});

const sourceSans = Source_Sans_3({
  variable: "--font-sourcesans",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: 'swap',
});

// Script/Handwriting fonts
const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: 'swap',
});

const pacifico = Pacifico({
  variable: "--font-pacifico",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const greatVibes = Great_Vibes({
  variable: "--font-greatvibes",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

const sacramento = Sacramento({
  variable: "--font-sacramento",
  subsets: ["latin"],
  weight: ["400"],
  display: 'swap',
});

// Monospace fonts
const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
  display: 'swap',
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
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      { rel: "icon", url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { rel: "icon", url: "/icon-512.png", sizes: "512x512", type: "image/png" },
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
    "msapplication-TileColor": "#F97316",
    "theme-color": "#F97316",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFBF7" },
    { media: "(prefers-color-scheme: dark)", color: "#0C0A09" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  colorScheme: "light dark",
  // Enable safe area support for iOS notch/home indicator
  viewportFit: "cover",
};

// JSON-LD Structured Data
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "QuoteSwipe",
  description: "Swipe through thousands of inspirational quotes from history's greatest minds. Save your favorites and share wisdom.",
  url: siteUrl,
  applicationCategory: "LifestyleApplication",
  operatingSystem: "Web, iOS, Android",
  browserRequirements: "Requires JavaScript. Works best in Chrome, Safari, Firefox, Edge",
  softwareVersion: "2.0",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
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
  screenshot: `${siteUrl}/og-image.png`,
  featureList: [
    "Swipe to discover quotes",
    "Save and bookmark favorites",
    "Share quotes on social media",
    "Create custom quote cards",
    "210+ quote categories",
    "60+ themes and 75+ fonts",
    "Multi-language support",
    "Dark mode support",
  ],
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "QuoteSwipe",
  url: siteUrl,
  logo: `${siteUrl}/logo.svg`,
  description: "A platform for discovering and sharing inspirational quotes",
  foundingDate: "2024",
  sameAs: [
    "https://twitter.com/quoteswipe",
    "https://www.instagram.com/quote_swipe/",
    "https://facebook.com/quoteswipe",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    email: "hello.quoteswipe@gmail.com",
    availableLanguage: ["English", "Hindi"],
  },
};

// FAQ Schema for better Google snippets
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What is QuoteSwipe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuoteSwipe is a free quote discovery app that lets you swipe through thousands of inspirational quotes from history's greatest minds. You can save favorites, create custom quote cards, and share wisdom with others.",
      },
    },
    {
      "@type": "Question",
      name: "Is QuoteSwipe free to use?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes, QuoteSwipe is completely free to use. You can browse quotes, save favorites, and share them without any cost. No credit card required.",
      },
    },
    {
      "@type": "Question",
      name: "How many quote categories does QuoteSwipe have?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "QuoteSwipe has over 210 categories covering topics like motivation, love, success, wisdom, humor, spirituality, relationships, and trending topics like situationships, hot takes, and more.",
      },
    },
    {
      "@type": "Question",
      name: "Can I create my own quotes on QuoteSwipe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! You can create your own quotes, customize them with 60+ themes, 75+ fonts, and custom background images. You can make them public to share with others or keep them private.",
      },
    },
    {
      "@type": "Question",
      name: "How do I share quotes from QuoteSwipe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can share quotes as high-quality images perfect for Instagram, WhatsApp, and other social media. Options include downloading the image, copying text, sharing via link, or generating a QR code.",
      },
    },
  ],
};

// WebSite schema for sitelinks search box
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "QuoteSwipe",
  url: siteUrl,
  description: "Discover inspirational quotes daily",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/?search={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
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
        {/* Blocking script to prevent theme flash - runs before React hydrates */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  if (theme === 'dark' || theme === 'light') {
                    document.documentElement.classList.add(theme);
                    document.documentElement.setAttribute('data-theme', theme);
                  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.classList.add('light');
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
        
        {/* Preconnect to external resources for faster loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* DNS Prefetch for analytics and APIs */}
        <link rel="dns-prefetch" href="https://www.google-analytics.com" />
        <link rel="dns-prefetch" href="https://www.googletagmanager.com" />
        
        {/* Structured Data - WebApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        {/* Structured Data - Organization */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        {/* Structured Data - FAQ Page */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
        />
        {/* Structured Data - Website (for sitelinks search) */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <meta name="google-site-verification" content="fLzbYgaZzmMOAE4_dHCPhIaw-febGh3FBSHxhMeljCY" />
      </head>
      <body
        className={`
          ${geistSans.variable} ${geistMono.variable}
          ${playfairDisplay.variable} ${merriweather.variable} ${lora.variable} 
          ${crimsonText.variable} ${cormorantGaramond.variable}
          ${roboto.variable} ${openSans.variable} ${lato.variable} 
          ${poppins.variable} ${montserrat.variable} ${inter.variable}
          ${nunito.variable} ${raleway.variable} ${sourceSans.variable}
          ${dancingScript.variable} ${pacifico.variable} 
          ${greatVibes.variable} ${sacramento.variable}
          ${jetbrainsMono.variable}
          antialiased
        `}
      >
        <ThemeProvider>
          <LanguageProvider>
            <UserProvider>
              <BackgroundsProvider>
                <CustomToaster />
                {children}
                <CookieConsent />
                <InstallAppModal />
              </BackgroundsProvider>
            </UserProvider>
          </LanguageProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
