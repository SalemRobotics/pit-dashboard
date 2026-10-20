"use client";

import { BellRing } from "lucide-react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { ALARM_REPEAT_MS, playAlarmBurst, unlockAudio } from "@/lib/alarm-audio";
import { clearTimer, getServerTimerEnd, getTimerEnd, subscribeTimer } from "@/lib/timer-store";
import { useNow } from "@/lib/use-now";
import { buttonClass } from "./button-class";

export function AlarmDialog({ volume }: { volume: number }) {
  const now = useNow();
  const end = useSyncExternalStore(subscribeTimer, getTimerEnd, getServerTimerEnd);
  const ringing = end !== null && now !== 0 && now >= end;
  const ref = useRef<HTMLDialogElement>(null);

  // Let a reloaded page sound the alarm after the first interaction.
  useEffect(() => {
    const unlock = () => {
      unlockAudio();
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
    document.addEventListener("pointerdown", unlock);
    document.addEventListener("keydown", unlock);
    return () => {
      document.removeEventListener("pointerdown", unlock);
      document.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!ringing) return;
    playAlarmBurst(volume);
    const id = setInterval(() => playAlarmBurst(volume), ALARM_REPEAT_MS);
    return () => clearInterval(id);
  }, [ringing, volume]);

  useEffect(() => {
    if (!ringing) return;
    const d = ref.current;
    if (d && !d.open) d.showModal();
    const prev = document.title;
    document.title = `⏰ ${prev}`;
    return () => {
      document.title = prev;
    };
  }, [ringing]);

  if (!ringing) return null;

  // The standards doc says "no modals", but the user explicitly requested a modal alarm.
  return (
    <dialog
      ref={ref}
      aria-labelledby="alarm-title"
      aria-describedby="alarm-text"
      onCancel={(e) => {
        e.preventDefault();
        clearTimer();
      }}
      className="m-auto w-[min(92vw,26rem)] animate-pop-in rounded-panel border border-line bg-surface p-6 text-ink shadow-pop backdrop:bg-black/60"
    >
      <div className="flex flex-col items-center text-center">
        <span className="mb-4 grid size-14 place-items-center rounded-full bg-warning-soft text-warning-ink ring-1 ring-warning-line">
          <BellRing className="size-6" aria-hidden />
        </span>
        <h2 id="alarm-title" className="text-[1.625rem] font-semibold tracking-[-0.02em]">
          Timer finished
        </h2>
        <p id="alarm-text" className="mt-1 text-[13px] text-ink-2">
          Your timer is up.
        </p>
        <button
          type="button"
          autoFocus
          onClick={clearTimer}
          className={buttonClass({ variant: "primary", size: "xl", className: "mt-6 w-full" })}
        >
          Dismiss alarm
        </button>
      </div>
    </dialog>
  );
}
