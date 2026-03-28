"use client";

import Link from "next/link";
import { Activity, BarChart3, Trophy, Wallet, Hexagon, Database } from "lucide-react";
import { usePathname } from "next/navigation";
import { cn, shortenAddress } from "@/lib/utils";
import { useCallback, useEffect, useState } from "react";

const navItems = [
  { href: "/",         label: "Arena",    icon: Activity   },
  { href: "/markets",  label: "Markets",  icon: BarChart3  },
  { href: "/agents",   label: "Rankings", icon: Trophy     },
  { href: "/portfolio",label: "Portfolio",icon: Wallet     },
];

/** MetaMask / EVM wallet button */
function WalletButton() {
  const [state, setState] = useState<"loading" | "disconnected" | "connected">("loading");
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const check = async () => {
      const eth = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string[]>; isMetaMask?: boolean } }).ethereum;
      if (!eth) { setState("disconnected"); return; }
      try {
        const accounts = await eth.request({ method: "eth_accounts" });
        if (accounts.length > 0) { setAddress(accounts[0]); setState("connected"); }
        else setState("disconnected");
      } catch { setState("disconnected"); }
    };
    const t = setTimeout(check, 200);
    return () => clearTimeout(t);
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as unknown as { ethereum?: { request: (a: { method: string; params?: unknown[] }) => Promise<string[]> } }).ethereum;
    if (!eth) {
      window.open("https://metamask.io/download/", "_blank");
      return;
    }
    try {
      // Switch to Filecoin Calibration (chainId 314159 = 0x4CB2F)
      try {
        await eth.request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x4CB2F" }] });
      } catch {
        await eth.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: "0x4CB2F",
            chainName: "Filecoin Calibration",
            nativeCurrency: { name: "tFIL", symbol: "tFIL", decimals: 18 },
            rpcUrls: ["https://api.calibration.node.glif.io/rpc/v1"],
            blockExplorerUrls: ["https://calibration.filfox.info/en"],
          }],
        });
      }
      const accounts = await eth.request({ method: "eth_requestAccounts" });
      setAddress(accounts[0]);
      setState("connected");
    } catch { /* user rejected */ }
  }, []);

  const disconnect = useCallback(() => {
    setAddress(null);
    setState("disconnected");
  }, []);

  if (state === "loading") {
    return (
      <button className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[13px] text-[var(--text-muted)]">
        ...
      </button>
    );
  }

  if (state === "connected" && address) {
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
    <button
      onClick={connect}
      className="rounded-lg border border-[var(--border-primary)] bg-[var(--bg-tertiary)] px-3 py-1.5 text-[13px] text-[var(--text-secondary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors"
    >
      Connect Wallet
    </button>
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
            <span className="text-[15px] font-semibold tracking-tight">hivemind</span>
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
          {/* Filecoin badge */}
          <div className="hidden items-center gap-1.5 rounded-md bg-[var(--bg-tertiary)] px-2.5 py-1 text-[11px] md:flex">
            <Database className="h-2.5 w-2.5 text-[var(--accent)]" />
            <span className="font-data text-[var(--text-tertiary)]">Filecoin</span>
          </div>
          {/* Chain badge */}
          <div className="hidden items-center gap-1.5 rounded-md bg-[var(--bg-tertiary)] px-2.5 py-1 text-[11px] md:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--positive)] animate-pulse-slow" />
            <span className="font-data text-[var(--text-tertiary)]">calibration</span>
          </div>
          <WalletButton />
        </div>
      </div>
    </header>
  );
}
