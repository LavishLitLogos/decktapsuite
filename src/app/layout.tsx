import type { Metadata } from "next";
import { Anton } from "next/font/google"; // Use Anton
import "./globals.css";
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

// Configure Anton font
const anton = Anton({
  variable: '--font-sans', // Assign Anton to --font-sans (body text)
  weight: "400", // Anton typically only has 400 weight
  subsets: ['latin'],
});

// Configure Anton font again for headings (can use the same config)
const antonHeading = Anton({
  variable: '--font-heading', // Assign Anton to --font-heading
  weight: "400",
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
      {/* Apply both Anton variables */}
      <body className={`${anton.variable} ${antonHeading.variable} antialiased bg-background text-foreground`}>
        <main className="flex-grow flex flex-col items-center justify-center p-4">
          {children}
        </main>
        <Toaster /> {/* Add Toaster for notifications */}
      </body>
    </html>
  );
}
