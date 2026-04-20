import type { Metadata } from "next";
export const metadata: Metadata = { title: "Centers", description: "Manage vaccination centers nationwide" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
