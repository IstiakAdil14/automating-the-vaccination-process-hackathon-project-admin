import type { Metadata } from "next";
export const metadata: Metadata = { title: "Supply Chain", description: "Vaccine inventory and dispatch tracking" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
