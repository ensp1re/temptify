import localFont from "next/font/local";
import "./globals.css";
import type { Metadata } from "next";
import { IBM_Plex_Sans } from "next/font/google";
import { cn } from "@/lib/utils";
import { ClerkProvider } from "@clerk/nextjs";

const IBM_Plex = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex",
});

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Temptify",
  description: "Ai-powered image genetation for your needs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider
      appearance={{
        variables: { 
          colorPrimary: "#42b883" },
      }}
    >
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} ${cn(
            "font-IBMPlex antialiased",
            IBM_Plex.variable
          )} antialiased`}
        >
          {" "}
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
