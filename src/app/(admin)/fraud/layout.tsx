import type { Metadata } from "next";
export const metadata: Metadata = { title: "Fraud & Audit", description: "Fraud detection, alerts, and audit trail" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
