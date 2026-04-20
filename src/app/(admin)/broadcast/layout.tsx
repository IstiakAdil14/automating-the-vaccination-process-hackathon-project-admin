import type { Metadata } from "next";
export const metadata: Metadata = { title: "Broadcast", description: "Send nationwide announcements" };
export default function Layout({ children }: { children: React.ReactNode }) { return <>{children}</>; }
