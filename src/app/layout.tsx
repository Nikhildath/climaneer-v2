import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { AppShell } from "@/components/AppShell";
import { PWARegister } from "@/components/PWARegister";

export const metadata: Metadata = {
  title: "climaneer v2 — Smart Agriculture Dashboard",
  description:
    "climaneer v2 is a real-time smart agriculture dashboard monitoring soil moisture, air humidity, temperature, pH levels, water level, and air quality via WebSocket.",
  keywords: ["smart agriculture", "IoT", "sensor dashboard", "soil moisture", "climaneer"],
  manifest: "/manifest.json",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
  appleWebApp: { capable: true, title: "climaneer v2", statusBarStyle: "black-translucent" },
};

export const viewport: Viewport = {
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
        />
        <link rel="preconnect" href="https://js.puter.com" />
        <link rel="dns-prefetch" href="https://js.puter.com" />
        <script src="https://js.puter.com/v2/" defer></script>
      </head>
      <body className="min-h-screen bg-background font-sans antialiased">
        <AppProvider>
          <AppShell>{children}</AppShell>
          <PWARegister />
        </AppProvider>
      </body>
    </html>
  );
}
