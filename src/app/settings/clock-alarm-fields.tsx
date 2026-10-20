"use client";

import { Volume2 } from "lucide-react";
import { useRef, useState } from "react";
import { buttonClass } from "@/components/button-class";
import { labelClass } from "@/components/ui";
import { playAlarmBurst } from "@/lib/alarm-audio";

const FORMATS = [
  { value: "12", label: "12-hour", example: "3:07 PM" },
  { value: "24", label: "24-hour", example: "15:07" },
] as const;

const TEST_THROTTLE_MS = 250;

export function ClockAlarmFields({
  initialFormat,
  initialVolume,
}: {
  initialFormat: "12" | "24";
  initialVolume: number;
}) {
  const [format, setFormat] = useState<string>(initialFormat);
  const [volume, setVolume] = useState(initialVolume);
  const lastPlayed = useRef(0);

  function onVolumeChange(value: number) {
    setVolume(value);
    const now = Date.now();
    if (now - lastPlayed.current < TEST_THROTTLE_MS) return;
    lastPlayed.current = now;
    playAlarmBurst(value);
  }

  return (
    <div className="grid gap-6">
      <fieldset>
        <legend className={labelClass}>Clock format</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {FORMATS.map((f) => (
            <label
              key={f.value}
              className="flex min-h-14 cursor-pointer items-center gap-3 rounded-control border border-line-strong bg-surface px-4 py-3 shadow-xs hover:bg-surface-hover has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring"
            >
              <input
                type="radio"
                name="clockFormat"
                value={f.value}
                checked={format === f.value}
                onChange={() => setFormat(f.value)}
                className="size-4 accent-accent"
              />
              <span className="flex flex-col">
                <span className="text-sm font-medium text-ink">{f.label}</span>
                <span className="text-[13px] tabular-nums text-ink-2">Example: {f.example}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="alarmVolume" className={labelClass}>
          Alarm volume
        </label>
        <div className="flex flex-wrap items-center gap-3">
          <input
            id="alarmVolume"
            name="alarmVolume"
            type="range"
            min={0}
            max={100}
            step={1}
            value={volume}
            onChange={(e) => onVolumeChange(Number(e.target.value))}
            className="min-w-40 flex-1 accent-accent"
          />
          <output
            htmlFor="alarmVolume"
            className="w-12 text-right text-[15px] font-semibold tabular-nums text-ink"
          >
            {volume}%
          </output>
          <button
            type="button"
            onClick={() => playAlarmBurst(volume)}
            className={buttonClass({ variant: "secondary", size: "sm" })}
          >
            <Volume2 className="size-4" aria-hidden />
            Play test sound
          </button>
        </div>
        <p className="mt-1.5 text-[13px] text-ink-3">
          Drag the slider to hear the alarm at that volume. At 0 the alarm is silent, but the alert still appears.
        </p>
      </div>
    </div>
  );
}
