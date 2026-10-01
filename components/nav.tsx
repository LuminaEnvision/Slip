"use client";

import { usePathname } from "next/navigation";

export function Nav() {
  const path = usePathname();
  const current = path.startsWith("/accept") ? "accept" : path.startsWith("/receipts") || path.startsWith("/p/") || path.startsWith("/slips") ? "receipts" : path === "/" || path === "/pay" ? "pay" : "";

  return (
    <nav className="nav" aria-label="Main">
      <a href="/" aria-current={current === "pay" ? "true" : undefined}>
        Pay
      </a>
      <a href="/accept" aria-current={current === "accept" ? "true" : undefined}>
        Accept payment
      </a>
      <a href="/receipts" aria-current={current === "receipts" ? "true" : undefined}>
        Receipts
      </a>
    </nav>
  );
}
