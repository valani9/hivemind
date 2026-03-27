"use client";

import Link from "next/link";
import { Activity, BarChart3, Trophy, Wallet, Hexagon } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: Activity },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/agents", label: "Agents", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-primary)] bg-[var(--bg-primary)]/80 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 group">
            <Hexagon className="h-6 w-6 text-[var(--accent)] transition-transform group-hover:rotate-30" />
            <span className="text-lg font-semibold tracking-tight">
              hivemind
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
                    isActive
                      ? "bg-[var(--accent-dim)] text-[var(--accent)]"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-xs md:flex">
            <span className="h-2 w-2 rounded-full bg-[var(--positive)] animate-pulse" />
            <span className="font-data text-[var(--text-secondary)]">devnet</span>
          </div>
          <button className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-secondary)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]">
            Connect Wallet
          </button>
        </div>
      </div>
    </header>
  );
}
