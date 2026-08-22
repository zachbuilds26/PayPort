import type { Metadata, Viewport } from "next";
import { Chakra_Petch, Space_Grotesk, Unbounded } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const chakra = Chakra_Petch({
  variable: "--font-chakra",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "PayPort",
    template: "%s | PayPort",
  },
  description:
    "PayPort helps merchants publish a clear dollar-priced checkout link and settle directly in native USDC on X Layer.",
  openGraph: {
    title: "PayPort",
    description:
      "PayPort helps merchants publish a clear dollar-priced checkout link and settle directly in native USDC on X Layer.",
    siteName: "PayPort",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary",
    title: "PayPort",
    description:
      "PayPort helps merchants publish a clear dollar-priced checkout link and settle directly in native USDC on X Layer.",
  },
  icons: {
    icon: [
      { url: "/PayPort-icon-black.png", sizes: "32x32", type: "image/png" },
      { url: "/PayPort-icon-black.png", sizes: "192x192", type: "image/png" },
      { url: "/PayPort-icon-black.png", sizes: "180x180", type: "image/png", rel: "apple-touch-icon" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${unbounded.variable} ${chakra.variable} ${spaceGrotesk.variable}`}>
      <body suppressHydrationWarning>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
