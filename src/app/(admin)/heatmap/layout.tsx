import type { Metadata } from "next";
export const metadata: Metadata = { title: "Heatmap", description: "Geographic vaccination coverage heatmap" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
