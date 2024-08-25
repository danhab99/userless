import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./index.css";
import { KeyContextProvider } from "@/components/KeyContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Userless",
  description: "A text based GPG threads board",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <KeyContextProvider>
          {children}
        </KeyContextProvider>
      </body>
    </html>
  );
}
