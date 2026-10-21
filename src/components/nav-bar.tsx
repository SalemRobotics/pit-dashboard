"use client";

import { ExternalLink, Menu, MonitorPlay, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import type { ClockFormat } from "@/lib/types";
import { ClockWidget } from "./clock-widget";

const links: { href: string; label: string; external?: boolean }[] = [
  { href: "/", label: "Display" },
  { href: "/survey/responses", label: "Repair reports" },
  { href: "/settings", label: "Settings" },
  {
    href: "https://attendance.frc6324.com",
    label: "Attendance",
    external: true,
  },
];

function LinkLabel({ l }: { l: (typeof links)[number] }) {
  if (!l.external) return <>{l.label}</>;
  return (
    <>
      {l.label}
      <ExternalLink className="ml-1.5 size-3.5" aria-hidden />
      <span className="sr-only"> (opens in a new tab)</span>
    </>
  );
}

export function NavBar({ clockFormat }: { clockFormat: ClockFormat }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isActive = (href: string) =>
    !href.startsWith("http") &&
    (href === "/" ? pathname === "/" : pathname.startsWith(href));

  return (
    <header className="sticky top-0 z-40 border-b border-header-line bg-header text-header-ink">
      <div className="flex h-14 items-center gap-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-control text-white"
        >
          <span className="grid size-7 place-items-center rounded-control bg-gradient-to-b from-brand-400 to-brand-600 shadow-[inset_0_1px_0_rgb(255_255_255/.25),0_1px_2px_rgb(0_0_0/.3)]">
            <MonitorPlay className="size-4" aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-[-0.01em]">
            6324 Pit Display
          </span>
        </Link>

        <nav aria-label="Main" className="hidden h-full md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              {...(l.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`relative flex items-center px-3.5 text-sm font-medium transition hover:text-white ${
                isActive(l.href)
                  ? "text-white after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:bg-header-active"
                  : ""
              }`}
            >
              <LinkLabel l={l} />
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <ClockWidget clockFormat={clockFormat} />
          <button
            type="button"
            className="grid size-9 place-items-center rounded-control hover:bg-white/10 md:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            aria-controls="mobile-nav"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? (
              <X className="size-5" aria-hidden />
            ) : (
              <Menu className="size-5" aria-hidden />
            )}
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Main"
          className="animate-pop-in border-t border-header-line bg-header px-2 py-2 md:hidden"
        >
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              {...(l.external
                ? { target: "_blank", rel: "noopener noreferrer" }
                : {})}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`flex items-center rounded-control px-3 py-2.5 text-sm font-medium hover:bg-white/10 ${
                isActive(l.href) ? "bg-white/10 text-white" : ""
              }`}
            >
              <LinkLabel l={l} />
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
