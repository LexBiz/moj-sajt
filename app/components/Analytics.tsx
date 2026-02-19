"use client";

import { useEffect } from "react";

declare global {
  interface Window {
    plausible?: (eventName: string, options?: { props?: Record<string, unknown> }) => void;
  }
}

type Props = {
  plausibleEnabled: boolean;
};

function safeTrack(eventName: string, props?: Record<string, unknown>) {
  try {
    window.plausible?.(eventName, props ? { props } : undefined);
  } catch {
    // ignore
  }
}

export function AnalyticsEvents({ plausibleEnabled }: Props) {
  useEffect(() => {
    if (!plausibleEnabled) return;

    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el) return;

      const a = el.closest("a") as HTMLAnchorElement | null;
      if (!a) return;

      const hrefRaw = a.getAttribute("href") || "";
      const href = hrefRaw.trim();
      if (!href) return;

      // Contact conversions
      if (href.startsWith("tel:")) return safeTrack("contact_tel");
      if (href.startsWith("mailto:")) return safeTrack("contact_email");
      if (href.includes("wa.me")) return safeTrack("contact_whatsapp");
      if (href.includes("t.me/")) return safeTrack("contact_telegram");

      // Key sections
      if (href === "#contact") return safeTrack("nav_contact");
      if (href === "#cases") return safeTrack("nav_cases");
      if (href === "#services") return safeTrack("nav_services");
      if (href === "#projects") return safeTrack("nav_projects");
    };

    let raf = 0;
    let fired75 = false;

    const onScroll = () => {
      if (fired75) return;
      if (raf) return;

      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const doc = document.documentElement;
        const max = doc.scrollHeight - window.innerHeight;
        if (max <= 0) return;
        const ratio = window.scrollY / max;
        if (ratio >= 0.75 && !fired75) {
          fired75 = true;
          safeTrack("scroll_75");
        }
      });
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("scroll", onScroll);
      if (raf) window.cancelAnimationFrame(raf);
    };
  }, [plausibleEnabled]);

  return null;
}




