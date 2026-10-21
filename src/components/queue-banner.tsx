"use client";

import { BellRing } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { QueueState } from "@/lib/types";

const POLL_MS = 3000;

export function QueueBanner() {
  const [match, setMatch] = useState<QueueState["match"]>(null);
  const bannerRef = useRef<HTMLDivElement>(null);

  // Publish the banner height so full-height pages (the display) can shrink to fit beneath it.
  useEffect(() => {
    const el = bannerRef.current;
    const root = document.documentElement;
    if (!el) return;
    const update = () => root.style.setProperty("--banner-h", `${el.offsetHeight}px`);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--banner-h");
    };
  }, [match]);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function poll() {
      if (document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch("/api/queue-status", { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const state = (await res.json()) as QueueState;
        if (!cancelled) setMatch(state.match);
      } catch {
        // Ignore network errors; keep the last known state.
      }
    }

    void poll();
    const id = setInterval(poll, POLL_MS);
    const onVisible = () => {
      if (!document.hidden) void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      clearInterval(id);
      controller?.abort();
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  const red = match?.alliance === "red";

  // The live region stays mounted so screen readers announce the banner when it appears.
  return (
    <div role="status" aria-live="polite">
      {match && (
        <div
          ref={bannerRef}
          className={`animate-fade-in-up px-4 py-3 text-white sm:px-6 ${red ? "bg-alliance-red" : "bg-alliance-blue"}`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <BellRing className="size-5 shrink-0" aria-hidden />
            <span className="font-semibold">Queue now: {red ? "Red" : "Blue"} alliance</span>
            <span className="text-sm tabular-nums">{match.label}</span>
          </div>
        </div>
      )}
    </div>
  );
}
