import { PLATFORM_CONFIG } from "@/lib/config";

export function Footer() {
  return (
    <footer className="border-t border-border bg-black px-4 py-2 flex items-center justify-between">
      <span className="mono text-[11px] text-muted">STMC TRADING</span>
      <span className="mono text-[11px] text-muted">
        {PLATFORM_CONFIG.brand.contactEmail}
      </span>
      <span className="mono text-[11px] text-muted">
        FEE: {(PLATFORM_CONFIG.defaultPlatformFeeBps / 100).toFixed(2)}%
      </span>
    </footer>
  );
}
