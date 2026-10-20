"use client";

import { useSyncExternalStore } from "react";
import type { ClockFormat } from "./types";

const subscribe = (cb: () => void) => {
  const id = setInterval(cb, 250);
  return () => clearInterval(id);
};
// Floored to the second so components only re-render when the displayed second changes.
const getSnapshot = () => Math.floor(Date.now() / 1000) * 1000;

/** Current time in epoch ms, ticking each second. Returns 0 on the server / first render. */
export function useNow(): number {
  return useSyncExternalStore(subscribe, getSnapshot, () => 0);
}

export function formatClock(ms: number, format: ClockFormat) {
  return new Intl.DateTimeFormat("en-US", {
    hour: format === "24" ? "2-digit" : "numeric",
    minute: "2-digit",
    hourCycle: format === "24" ? "h23" : "h12",
  }).format(ms);
}

/** 04:32, or 1:04:32 for an hour or more. */
export function formatRemaining(ms: number) {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, "0");
  const ss = String(s).padStart(2, "0");
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}
