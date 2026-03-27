"use client";

import Link from "next/link";
import { Activity, BarChart3, Trophy, Wallet, Hexagon, Download, X, ExternalLink } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn, shortenAddress } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const navItems = [
  { href: "/", label: "Arena", icon: Activity },
  { href: "/markets", label: "Markets", icon: BarChart3 },
  { href: "/agents", label: "Rankings", icon: Trophy },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
];

function WalletButton() {
  const [walletState, setWalletState] = useState<"loading" | "not-installed" | "disconnected" | "connected">("loading");
  const [address, setAddress] = useState<string | null>(null);
  const [showInstallModal, setShowInstallModal] = useState(false);

  useEffect(() => {
    // Check if Phantom is installed (runs client-side only)
    const checkWallet = () => {
      const phantom = (window as any).phantom?.solana || (window as any).solana;
      if (phantom?.isPhantom) {
        if (phantom.isConnected && phantom.publicKey) {
          setAddress(phantom.publicKey.toString());
          setWalletState("connected");
        } else {
          setWalletState("disconnected");
        }
      } else {
        setWalletState("not-installed");
      }
    };
    // Small delay for extension injection
    const timer = setTimeout(checkWallet, 300);
    return () => clearTimeout(timer);
  }, []);

  const connect = useCallback(async () => {
    const phantom = (window as any).phantom?.solana || (window as any).solana;
    if (!phantom?.isPhantom) {
      setShowInstallModal(true);
      return;
    }
    try {
      const resp = await phantom.connect();
      setAddress(resp.publicKey.toString());
      setWalletState("connected");
    } catch {
      // User rejected
    }
  }, []);

  const disconnect = useCallback(async () => {
    const phantom = (window as any).phantom?.solana || (window as any).solana;
    if (phantom) {
      await phantom.disconnect();
      setAddress(null);
      setWalletState("disconnected");
    }
  }, []);

  if (walletState === "loading") {
    return (
      <button className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[13px] text-[var(--text-muted)]">
        ...
      </button>
    );
  }

  if (walletState === "connected" && address) {
    return (
      <button
        onClick={disconnect}
        className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-primary)] hover:border-[var(--border-active)] transition-colors font-data"
      >
        {shortenAddress(address, 4)}
      </button>
    );
  }

  return (
    <>
      <button
        onClick={connect}
        className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
      >
        Connect Wallet
      </button>

      {/* Install Wallet Modal */}
      {showInstallModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowInstallModal(false)}>
          <div className="relative w-full max-w-sm mx-4 rounded-xl border border-[var(--border-primary)] bg-[var(--bg-secondary)] p-6" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setShowInstallModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-secondary)]">
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--agent-purple-muted)]">
                <Download className="h-5 w-5 text-[var(--agent-purple)]" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">Wallet Required</h3>
                <p className="text-[11px] text-[var(--text-muted)]">Install a Solana wallet to continue</p>
              </div>
            </div>

            <p className="text-[13px] text-[var(--text-secondary)] mb-5 leading-relaxed">
              You need a Solana wallet browser extension to connect. Install one of the wallets below, then refresh and try again.
            </p>

            <div className="space-y-2">
              <a
                href="https://phantom.app/download"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3 text-[13px] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">👻</span>
                  <div>
                    <div className="font-medium">Phantom</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Most popular Solana wallet</div>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </a>
              <a
                href="https://solflare.com/download"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between rounded-lg border border-[var(--border-primary)] bg-[var(--bg-primary)] px-4 py-3 text-[13px] hover:border-[var(--border-active)] hover:bg-[var(--bg-hover)] transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg">🔆</span>
                  <div>
                    <div className="font-medium">Solflare</div>
                    <div className="text-[11px] text-[var(--text-muted)]">Advanced Solana wallet</div>
                  </div>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-[var(--text-muted)]" />
              </a>
            </div>

            <p className="mt-4 text-center text-[11px] text-[var(--text-muted)]">
              Use Chrome, Brave, or Edge for extension support
            </p>
          </div>
        </div>
      )}
    </>
  );
}

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
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
