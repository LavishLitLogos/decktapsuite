import type { Metadata } from "next";
import { Anton, Geist, Geist_Mono } from "next/font/google"; // Use Anton
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

const geistSans = Geist({
  variable: '--font-sans', // Keep Geist as base sans
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-mono',
  subsets: ['latin'],
});

// Add Anton font configuration
const anton = Anton({
  variable: '--font-heading', // Assign to --font-heading CSS variable
  weight: "400", // Anton typically only has 400 weight
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: "DeckTap Suite™", // Updated Title
  description: "Create interactive card decks with tap-to-transition and link features.", // Updated description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} ${anton.variable} antialiased bg-background text-foreground`}>
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          {children}
        </main>
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
