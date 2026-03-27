import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatSOL(lamports: number | bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  return sol.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
}

export function formatPrice(price: number): string {
  return (price * 100).toFixed(1) + "%";
}

export function formatPnL(lamports: number | bigint): string {
  const sol = Number(lamports) / 1_000_000_000;
  const sign = sol >= 0 ? "+" : "";
  return sign + sol.toFixed(4) + " SOL";
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars)}...${address.slice(-chars)}`;
}

export function timeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  if (diff <= 0) return "Closed";
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days}d ${hours % 24}h`;
  const mins = Math.floor((diff / (1000 * 60)) % 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}
