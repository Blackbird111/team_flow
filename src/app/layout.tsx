import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { SessionProvider } from "@/components/providers/session-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "@/components/ui/sonner";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  icons: {
    icon: "/favicon.svg",
    apple: "/favicon.svg",
  },
  title: {
    template: "%s | TeamFlow",
    default: "TeamFlow — Project management for agencies",
  },
  description:
    "Project management built for client work — tasks, time tracking, client portal, and AI analysis in one place.",
  keywords: ["project management", "agency", "client work", "time tracking"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geist.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          disableTransitionOnChange
        >
          <SessionProvider>
            {children}
            <Toaster position="bottom-right" richColors />
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}