import type { Metadata } from "next";
export const metadata: Metadata = { title: "Staff", description: "Manage vaccination center staff" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
