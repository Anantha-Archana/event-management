import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Gather — events worth showing up for", description: "Discover local events and make room for something memorable." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
