"use client";

import Link from "next/link";
import { Activity, BarChart3, Trophy, Wallet, Hexagon } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (mod) => mod.WalletMultiButton
    ),
  { ssr: false }
);

const navItems = [
  { href: "/", label: "Arena", icon: Activity },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/agents", label: "Rankings", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <Hexagon className="h-5 w-5 text-[var(--accent)] transition-all group-hover:rotate-90 duration-500" />
            <span className="text-[15px] font-semibold tracking-tight">
              hivemind
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors",
                    isActive
                      ? "text-[var(--text-primary)] bg-[var(--bg-tertiary)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]"
                  )}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-1.5 rounded-md bg-[var(--bg-tertiary)] px-2.5 py-1 text-[11px] md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse-slow" />
            <span className="font-data text-[var(--text-tertiary)]">devnet</span>
          </div>
          <WalletMultiButton />
        </div>
      </div>
    </header>
  );
}
