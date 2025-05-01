import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// Removed Anton font import as Impact will be handled via Tailwind config

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
      {/* Apply default Tailwind font classes (which now include Impact) */}
      <body className="antialiased bg-background text-foreground font-sans"> {/* Ensure font-sans is applied */}
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          {children}
        </main>
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
