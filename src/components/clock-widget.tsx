"use client";

import { Clock, Timer } from "lucide-react";
import { useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { formatClock, formatRemaining, useNow } from "@/lib/use-now";
import { clearTimer, getServerTimerEnd, getTimerEnd, startTimer, subscribeTimer } from "@/lib/timer-store";
import type { ClockFormat } from "@/lib/types";
import { buttonClass } from "./button-class";
import { Field, inputClass } from "./ui";

const PRESETS = [1, 5, 10, 15, 30];

export function ClockWidget({ clockFormat }: { clockFormat: ClockFormat }) {
  const now = useNow();
  const end = useSyncExternalStore(subscribeTimer, getTimerEnd, getServerTimerEnd);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverId = useId();
  const customId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  const mounted = now !== 0;
  const timeText = mounted ? formatClock(now, clockFormat) : "--:--";
  const running = mounted && end !== null && end > now;
  const remaining = running ? formatRemaining(end - now) : "";

  const start = (minutes: number) => {
    if (!Number.isFinite(minutes) || minutes < 1 || minutes > 600) return;
    startTimer(minutes * 60_000);
    setCustom("");
    setOpen(false);
  };

  return (
    <div ref={rootRef} className="relative flex items-center gap-2">
      {running && (
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label={`Timer, ${remaining} remaining`}
          className="inline-flex h-7 items-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-medium text-white hover:bg-white/15"
        >
          <Timer className="size-4" aria-hidden />
          <span role="timer" className="tabular">
            {remaining}
          </span>
        </button>
      )}
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? popoverId : undefined}
        aria-label={mounted ? `Clock, ${timeText}. Open timer` : "Clock. Open timer"}
        className="inline-flex h-9 items-center gap-2 rounded-control px-2.5 text-sm font-medium text-white hover:bg-white/10"
      >
        <Clock className="size-4" aria-hidden />
        <span className="tabular inline-block min-w-[4.5ch] text-right">{timeText}</span>
      </button>

      {open && (
        <div
          id={popoverId}
          role="dialog"
          aria-label="Timer"
          className="absolute right-0 top-full mt-2 w-72 animate-pop-in rounded-card border border-line bg-surface p-4 text-ink shadow-pop"
        >
          {running ? (
            <div className="space-y-4">
              <div>
                <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Timer running</h2>
                <p className="tabular mt-2 text-[1.75rem] font-semibold leading-none tracking-[-0.02em]">
                  {remaining}
                </p>
                <p className="mt-1.5 text-[13px] text-ink-2">remaining</p>
              </div>
              <button
                type="button"
                className={buttonClass({ variant: "danger-soft", size: "md", className: "w-full" })}
                onClick={() => {
                  clearTimer();
                  setOpen(false);
                }}
              >
                Cancel timer
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="text-[15px] font-semibold tracking-[-0.01em]">Start a timer</h2>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                    onClick={() => start(m)}
                  >
                    {m} min
                  </button>
                ))}
              </div>
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  start(Number(custom));
                }}
              >
                <Field label="Custom minutes" htmlFor={customId}>
                  <input
                    id={customId}
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={600}
                    step={1}
                    required
                    value={custom}
                    onChange={(e) => setCustom(e.target.value)}
                    className={`${inputClass} tabular`}
                  />
                </Field>
                <button type="submit" className={buttonClass({ variant: "primary", size: "md", className: "w-full" })}>
                  Start timer
                </button>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
