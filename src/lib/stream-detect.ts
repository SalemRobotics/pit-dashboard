import { readSettings } from "./store";
import { getEventResult, resolveEventKey, type TbaEvent, type TbaWebcast } from "./tba";
import type { StreamStatus } from "./types";

const ymdIn = (timeZone: string | null | undefined, d = new Date()): string => {
  try {
    return new Intl.DateTimeFormat("en-CA", timeZone ? { timeZone } : undefined).format(d);
  } catch {
    return new Intl.DateTimeFormat("en-CA").format(d);
  }
};

const isHttp = (s: string) => /^https?:\/\/\S+$/i.test(s);

/** Webcast -> URL the embed resolver understands, or null when unsupported. */
export function webcastUrl(w: TbaWebcast): string | null {
  const channel = (w.channel ?? "").trim();
  if (!channel) return null;
  switch (w.type) {
    case "twitch":
      return `https://www.twitch.tv/${channel}`;
    case "youtube":
      return `https://www.youtube.com/watch?v=${channel}`;
    case "iframe": {
      const m = /src\s*=\s*["']?(https?:\/\/[^"'\s>]+)/i.exec(channel);
      return m ? m[1].replace(/&amp;/g, "&") : null;
    }
    case "direct_link":
      return isHttp(channel) ? channel : null;
    default:
      return null;
  }
}

const TYPE_NAMES: Record<string, string> = { twitch: "Twitch", youtube: "YouTube", iframe: "Stream", direct_link: "Stream" };

function niceDate(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

/** Pure: chooses today's webcast from an event's list. */
export function pickWebcast(webcasts: TbaWebcast[] | null | undefined, today: string): { url: string; label: string } | null {
  const usable = (webcasts ?? []).flatMap((w) => {
    const url = webcastUrl(w);
    return url ? [{ w, url }] : [];
  });
  let pool = usable.filter((c) => c.w.date === today);
  if (!pool.length) pool = usable.filter((c) => !c.w.date);
  if (!pool.length) return null;
  const best = pool.find((c) => c.w.status === "online") ?? pool[0];
  const name = TYPE_NAMES[best.w.type] ?? "Stream";
  const channel = best.w.type === "twitch" || best.w.type === "youtube" ? best.w.channel.trim() : new URL(best.url).hostname;
  const label = `${name}: ${channel}${best.w.date ? ` (${niceDate(best.w.date)})` : ""}`;
  return { url: best.url, label };
}

export async function getStreamStatus(): Promise<StreamStatus> {
  const s = await readSettings();
  const manualKey = s.eventKey.trim().toLowerCase();
  const base: StreamStatus = {
    url: "",
    source: "none",
    label: "",
    eventKey: manualKey || null,
    eventName: null,
    eventAuto: false,
    error: null,
    checkedAt: null,
  };
  const manual = (): Pick<StreamStatus, "url" | "source" | "label"> =>
    s.streamUrl ? { url: s.streamUrl, source: "manual", label: s.streamUrl } : { url: "", source: "none", label: "" };

  if (!s.autoStream || !s.tbaApiKey) return { ...base, ...manual() };

  try {
    const resolved = await resolveEventKey(s);
    const out: StreamStatus = {
      ...base,
      eventKey: resolved.eventKey,
      eventName: resolved.eventName,
      eventAuto: resolved.auto,
      error: resolved.error ?? null,
    };
    if (!resolved.eventKey) {
      return { ...out, ...manual(), error: out.error ?? "No event found for team 6324 yet. Enter an event key in settings." };
    }
    const ev = await getEventResult(resolved.eventKey, s.tbaApiKey);
    const event: TbaEvent | null = ev.data;
    if (event) {
      out.eventName = event.name || out.eventName;
      out.checkedAt = ev.fetchedAt;
    }
    out.error = ev.error ?? out.error;
    const pick = event ? pickWebcast(event.webcasts, ymdIn(event.timezone)) : null;
    if (pick) return { ...out, url: pick.url, source: "auto", label: pick.label };
    return { ...out, ...manual() };
  } catch {
    return { ...base, ...manual(), error: "Couldn't reach The Blue Alliance." };
  }
}
