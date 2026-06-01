import "~/styles/globals.css";

import { type Metadata } from "next";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "CherryIN Skills Marketplace",
  description: "Browse and install curated AI agent skills",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

// 字体与 cherryin 原版一致:本地加载(避免 Google Fonts CDN)
const inter = localFont({
  src: "../../public/fonts/inter-latin.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});
const jetbrainsMono = localFont({
  src: "../../public/fonts/jetbrains-mono-latin.woff2",
  weight: "100 800",
  variable: "--font-mono",
  display: "swap",
});
const poppins = localFont({
  src: [
    { path: "../../public/fonts/poppins-400.woff2", weight: "400" },
    { path: "../../public/fonts/poppins-500.woff2", weight: "500" },
    { path: "../../public/fonts/poppins-600.woff2", weight: "600" },
    { path: "../../public/fonts/poppins-700.woff2", weight: "700" },
    { path: "../../public/fonts/poppins-800.woff2", weight: "800" },
  ],
  variable: "--font-poppins",
  display: "swap",
});

export default async function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const locale = await getLocale();
  const messages = await getMessages();
  return (
    <html
      lang={locale}
      className={`${inter.variable} ${jetbrainsMono.variable} ${poppins.variable}`}
    >
      <body>
        <NextIntlClientProvider messages={messages}>
          <TRPCReactProvider>{children}</TRPCReactProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
