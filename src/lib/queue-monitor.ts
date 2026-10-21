import { playQueueAlert, type AlertResult } from "./audio-duck";
import { fetchOurQueuedMatch } from "./nexus";
import { readSettings } from "./store";
import { resolveEventKey } from "./tba";
import type { Alliance, QueueState } from "./types";

const POLL_MS = 8000;
const ERROR_BACKOFF_MS = 30000;

interface Monitor {
  state: QueueState;
  started: boolean;
  firstPollDone: boolean;
  lastLabel: string | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const g = globalThis as unknown as { __pitQueueMonitor?: Monitor };
const monitor: Monitor = (g.__pitQueueMonitor ??= {
  state: { configured: false, lastChecked: null, error: null, match: null },
  started: false,
  firstPollDone: false,
  lastLabel: null,
  timer: null,
});

async function poll(): Promise<number> {
  const m = monitor;
  try {
    const settings = await readSettings();
    const resolved = settings.nexusApiKey ? await resolveEventKey(settings) : null;
    if (resolved?.error && !resolved.eventKey) {
      m.state = { configured: true, lastChecked: m.state.lastChecked, error: resolved.error, match: null };
      return ERROR_BACKOFF_MS;
    }
    const eventKey = resolved?.eventKey;
    if (!settings.nexusApiKey || !eventKey) {
      m.state = { configured: false, lastChecked: m.state.lastChecked, error: null, match: null };
      return POLL_MS;
    }
    const match = await fetchOurQueuedMatch(settings.nexusApiKey, eventKey);
    m.state = {
      configured: true,
      lastChecked: new Date().toISOString(),
      error: null,
      match: match ? { label: match.label, alliance: match.alliance } : null,
    };
    if (match) {
      const isNew = match.label !== m.lastLabel;
      if (isNew && m.firstPollDone && settings.queueAlertEnabled) {
        playQueueAlert(match.alliance, { chimeVolume: settings.chimeVolume, duckLevel: settings.duckLevel }).catch((e) =>
          console.error("[queue-monitor] alert failed:", (e as Error).message),
        );
      }
      m.lastLabel = match.label;
    }
    m.firstPollDone = true;
    return POLL_MS;
  } catch (e) {
    m.state = { ...m.state, configured: true, error: e instanceof Error ? e.message : "Couldn't reach Nexus." };
    return ERROR_BACKOFF_MS;
  }
}

function loop() {
  poll()
    .catch(() => ERROR_BACKOFF_MS)
    .then((delay) => {
      monitor.timer = setTimeout(loop, delay);
    });
}

export function startQueueMonitor() {
  if (monitor.started) return;
  monitor.started = true;
  loop();
}

export function getQueueState(): QueueState {
  return monitor.state;
}

export async function triggerTestAlert(alliance: Alliance): Promise<AlertResult> {
  const s = await readSettings();
  return playQueueAlert(alliance, { chimeVolume: s.chimeVolume, duckLevel: s.duckLevel });
}
