import { TEAM_NUMBER, type Settings } from "./types";

// TBA_BASE_URL exists so tests can point at a fake server.
const BASE = process.env.TBA_BASE_URL ?? "https://www.thebluealliance.com/api/v3";
const TTL_MS = 10 * 60 * 1000;

interface CacheEntry {
  etag: string | null;
  body: unknown;
  /** ms epoch of the last successful fetch/revalidation. */
  at: number;
}

const g = globalThis as unknown as { __pitTbaCache?: Map<string, CacheEntry> };
const cache: Map<string, CacheEntry> = (g.__pitTbaCache ??= new Map());

export interface TbaResult<T> {
  data: T | null;
  /** Friendly message when the latest fetch failed (data may still hold the last good body). */
  error: string | null;
  /** ISO time of the last successful fetch, or null. */
  fetchedAt: string | null;
}

/** Like tbaGet but never throws: stale data is returned alongside the error text. */
export async function tbaFetch<T>(path: string, apiKey: string): Promise<TbaResult<T>> {
  const hit = cache.get(path);
  const ok = (e: CacheEntry): TbaResult<T> => ({ data: e.body as T, error: null, fetchedAt: new Date(e.at).toISOString() });
  const stale = (error: string): TbaResult<T> => ({
    data: hit ? (hit.body as T) : null,
    error,
    fetchedAt: hit ? new Date(hit.at).toISOString() : null,
  });
  if (hit && Date.now() - hit.at < TTL_MS) return ok(hit);

  let res: Response;
  try {
    res = await fetch(`${BASE}${path}`, {
      headers: { "X-TBA-Auth-Key": apiKey, ...(hit?.etag ? { "If-None-Match": hit.etag } : {}) },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
  } catch {
    return stale("Couldn't reach The Blue Alliance.");
  }
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return ok(hit);
  }
  if (res.status === 401 || res.status === 403) return stale("The Blue Alliance rejected the API key.");
  if (res.status === 404) return stale("The Blue Alliance doesn't have that event.");
  if (!res.ok) return stale("Couldn't reach The Blue Alliance.");
  try {
    const body = await res.json();
    const entry = { etag: res.headers.get("etag"), body, at: Date.now() };
    cache.set(path, entry);
    return ok(entry);
  } catch {
    return stale("Couldn't reach The Blue Alliance.");
  }
}

/** Throws a friendly Error on failure (even when a stale body exists; use tbaFetch to get both). */
export async function tbaGet<T>(path: string, apiKey: string): Promise<T> {
  const r = await tbaFetch<T>(path, apiKey);
  if (r.error || r.data === null) throw new Error(r.error ?? "Couldn't reach The Blue Alliance.");
  return r.data;
}

export interface TbaWebcast {
  type: string;
  channel: string;
  date?: string | null;
  file?: string | null;
  status?: "unknown" | "online" | "offline" | null;
  stream_title?: string | null;
}

export interface TbaEvent {
  key: string;
  name: string;
  start_date: string;
  end_date: string;
  timezone?: string | null;
  webcasts?: TbaWebcast[] | null;
}

export async function getEventResult(eventKey: string, apiKey: string): Promise<TbaResult<TbaEvent>> {
  return tbaFetch<TbaEvent>(`/event/${encodeURIComponent(eventKey)}`, apiKey);
}

export async function getEvent(eventKey: string, apiKey: string): Promise<TbaEvent> {
  return tbaGet<TbaEvent>(`/event/${encodeURIComponent(eventKey)}`, apiKey);
}

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function shiftDay(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}

/** Pure: picks the event to attend from a team's season list. Dates are yyyy-mm-dd. */
export function pickEvent<E extends { key: string; start_date: string; end_date: string }>(events: E[], today: string): E | null {
  if (!events.length) return null;
  const sorted = [...events].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const current = sorted.find((e) => shiftDay(e.start_date, -1) <= today && today <= shiftDay(e.end_date, 1));
  if (current) return current;
  const upcoming = sorted.find((e) => e.start_date > today);
  if (upcoming) return upcoming;
  return sorted[sorted.length - 1];
}

export interface ResolvedEvent {
  eventKey: string | null;
  eventName: string | null;
  auto: boolean;
  /** Set when auto-detection failed (extra to the requested shape). */
  error?: string | null;
}

export async function resolveEventKey(
  settings: Pick<Settings, "eventKey" | "tbaApiKey">,
): Promise<ResolvedEvent> {
  const manual = settings.eventKey.trim().toLowerCase();
  if (manual) return { eventKey: manual, eventName: null, auto: false, error: null };
  if (!settings.tbaApiKey) return { eventKey: null, eventName: null, auto: true, error: null };

  const now = new Date();
  const r = await tbaFetch<{ key: string; name: string; start_date: string; end_date: string }[]>(
    `/team/frc${TEAM_NUMBER}/events/${now.getFullYear()}/simple`,
    settings.tbaApiKey,
  );
  const ev = Array.isArray(r.data) ? pickEvent(r.data, ymd(now)) : null;
  return { eventKey: ev?.key ?? null, eventName: ev?.name ?? null, auto: true, error: r.error };
}
