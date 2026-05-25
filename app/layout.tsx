import type { Metadata } from "next";
import { Toaster } from "react-hot-toast";
import Navbar from "@/components/Navbar";
import "./globals.css";

export const metadata: Metadata = {
  title: "PrivateStream Mezo — Encrypted Video Access on Mezo",
  description:
    "Privacy-preserving encrypted video access platform on Mezo Testnet - updated 2026.",
  keywords: ["Mezo", "encrypted video", "Web3", "privacy", "blockchain"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased">
        <Navbar />
        <main className="relative z-10 pt-20 min-h-screen">
          {children}
        </main>
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: "rgba(15, 15, 25, 0.95)",
              color: "#f0f0f5",
              border: "1px solid rgba(255,255,255,0.1)",
              backdropFilter: "blur(12px)",
              borderRadius: "12px",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#06b6d4", secondary: "#050508" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#050508" },
            },
          }}
        />
      </body>
    </html>
  );
}
