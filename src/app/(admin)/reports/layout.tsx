import type { Metadata } from "next";
export const metadata: Metadata = { title: "Reports", description: "Generate and export vaccination reports" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
