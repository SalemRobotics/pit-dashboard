"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui";
import type { RobotLogState } from "@/lib/types";

const POLL_MS = 4000;

const INITIAL: RobotLogState = { status: "idle", error: null, lastSeen: null, lastPulled: null };

export function RobotLogsPanel() {
  const [state, setState] = useState<RobotLogState>(INITIAL);

  useEffect(() => {
    let cancelled = false;
    let controller: AbortController | null = null;

    async function poll() {
      if (document.hidden) return;
      controller?.abort();
      controller = new AbortController();
      try {
        const res = await fetch("/api/robot-logs", { cache: "no-store", signal: controller.signal });
        if (!res.ok) return;
        const next = (await res.json()) as RobotLogState;
        if (!cancelled) setState(next);
      } catch {
        // Keep showing the last known state if the check fails.
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

  const badge =
    state.status === "idle" ? (
      <Badge tone="neutral">Not connected</Badge>
    ) : state.status === "searching" ? (
      <Badge tone="neutral">Looking for the robot…</Badge>
    ) : state.status === "error" ? (
      <Badge tone="danger">Problem</Badge>
    ) : (
      <Badge tone="accent">{state.status === "pulling" ? "Pulling logs…" : "Connected"}</Badge>
    );

  return (
    <div className="flex h-full flex-col items-start justify-center gap-3 p-4" aria-live="polite">
      <p className="text-[13px] text-ink-2">Logs are pulled from the robot automatically once it is connected.</p>
      <div className="flex flex-wrap items-center gap-2">
        {badge}
        {state.status === "error" && state.error && <span className="text-[13px] text-ink-2">{state.error}</span>}
      </div>
      {state.lastPulled && (
        <p className="text-[13px] text-ink-3">
          Latest log: <span className="text-ink-2">{state.lastPulled.matchLabel ?? state.lastPulled.fileName}</span>{" "}
          <span className="tabular-nums">({new Date(state.lastPulled.pulledAt).toLocaleTimeString()})</span>
        </p>
      )}
    </div>
  );
}
