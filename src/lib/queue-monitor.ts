import { playQueueAlert, type AlertResult } from "./audio-duck";
import { fetchQueueTrack, type QueueTrack } from "./nexus";
import { readSettings } from "./store";
import { resolveEventKey } from "./tba";
import type { Alliance, QueueState } from "./types";

const POLL_MS = 8000;
const ERROR_BACKOFF_MS = 30000;

interface Monitor {
  state: QueueState;
  started: boolean;
  firstPollDone: boolean;
  /** The match currently shown on the banner, kept until TBA/Nexus marks it played. */
  track: QueueTrack | null;
  timer: ReturnType<typeof setTimeout> | null;
}

const g = globalThis as unknown as { __pitQueueMonitor?: Monitor };
const monitor: Monitor = (g.__pitQueueMonitor ??= {
  state: { configured: false, lastChecked: null, error: null, match: null },
  started: false,
  firstPollDone: false,
  track: null,
  timer: null,
});

async function poll(): Promise<number> {
  const m = monitor;
  try {
    const settings = await readSettings();
    if (!settings.tbaApiKey) {
      m.state = { configured: false, lastChecked: m.state.lastChecked, error: null, match: null };
      m.track = null;
      return POLL_MS;
    }
    const resolved = await resolveEventKey(settings);
    if (resolved.error && !resolved.eventKey) {
      m.state = { configured: true, lastChecked: m.state.lastChecked, error: resolved.error, match: null };
      return ERROR_BACKOFF_MS;
    }
    const eventKey = resolved.eventKey;
    if (!eventKey) {
      m.state = { configured: false, lastChecked: m.state.lastChecked, error: null, match: null };
      m.track = null;
      return POLL_MS;
    }
    const track = await fetchQueueTrack(settings.tbaApiKey, eventKey, m.track);
    m.state = {
      configured: true,
      lastChecked: new Date().toISOString(),
      error: null,
      match: track ? { label: track.label, alliance: track.alliance } : null,
    };
    if (track) {
      const isNew = track.matchKey !== m.track?.matchKey;
      if (isNew && m.firstPollDone && settings.queueAlertEnabled) {
        playQueueAlert(track.alliance, { chimeVolume: settings.chimeVolume, duckLevel: settings.duckLevel }).catch((e) =>
          console.error("[queue-monitor] alert failed:", (e as Error).message),
        );
      }
    }
    m.track = track;
    m.firstPollDone = true;
    return POLL_MS;
  } catch (e) {
    m.state = { ...m.state, configured: true, error: e instanceof Error ? e.message : "Couldn't reach The Blue Alliance." };
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
