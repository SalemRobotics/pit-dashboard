"use client";

import { useState } from "react";
import { Field, inputClass } from "@/components/ui";

function RangeField({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <Field label={label} htmlFor={id} hint={hint}>
      <div className="flex items-center gap-3">
        <input
          id={id}
          name={id}
          type="range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="min-w-40 flex-1 accent-accent"
        />
        <output htmlFor={id} className="w-12 text-right text-[15px] font-semibold tabular-nums text-ink">
          {value}%
        </output>
      </div>
    </Field>
  );
}

export function QueueAlertFields({
  hasKey,
  initialEnabled,
  initialVolume,
  initialDuck,
}: {
  hasKey: boolean;
  initialEnabled: boolean;
  initialVolume: number;
  initialDuck: number;
}) {
  const [volume, setVolume] = useState(initialVolume);
  const [duck, setDuck] = useState(initialDuck);
  const checkClass = "size-4 accent-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

  return (
    <div className="grid gap-4">
      <div>
        <Field
          label="Nexus API key"
          htmlFor="nexusApiKey"
          hint="Get a key at frc.nexus/api. Leave blank to keep the saved key. Alerts use the event key set above."
        >
          <input
            id="nexusApiKey"
            name="nexusApiKey"
            type="password"
            autoComplete="off"
            className={inputClass}
            placeholder={hasKey ? "Saved" : "Paste your key"}
          />
        </Field>
        {hasKey && (
          <label className="mt-2 flex items-center gap-2 text-sm text-ink">
            <input type="checkbox" name="clearNexusApiKey" className={checkClass} />
            Remove the saved key
          </label>
        )}
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" name="queueAlertEnabled" defaultChecked={initialEnabled} className={checkClass} />
        Play a chime when the robot is queued
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <RangeField id="chimeVolume" label="Chime and voice volume" value={volume} onChange={setVolume} />
        <RangeField
          id="duckLevel"
          label="Lower other audio to"
          hint="While the alert plays, music on this device drops to this percent of its volume, then comes back."
          value={duck}
          onChange={setDuck}
        />
      </div>
    </div>
  );
}
