"use client";

import { signOut } from "next-auth/react";
import { Bell, LogOut, Moon, Sun, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function Topbar({ userEmail }: { userEmail?: string | null }) {
  const [dark, setDark] = useState(false);

  function toggleTheme() {
    setDark((d) => !d);
    document.documentElement.classList.toggle("dark");
  }

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <p className="text-sm text-muted-foreground">
        Government Vaccination Management System
      </p>
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleTheme}>
          {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="text-muted-foreground">{userEmail ?? "Admin"}</span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => signOut({ callbackUrl: "/login" })}>
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
