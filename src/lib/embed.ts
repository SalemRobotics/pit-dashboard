const YT_ID = /^[\w-]{6,20}$/;

function youtubeEmbed(id: string) {
  return YT_ID.test(id) ? `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&rel=0` : null;
}

/**
 * Turns a pasted stream/page URL into something that can be put in an iframe.
 * Returns null when the URL can't be embedded (invalid, non-http(s), or Twitch without a host).
 */
export function resolveEmbedUrl(raw: string, host: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;

  const hostname = url.hostname.toLowerCase().replace(/^(www|m)\./, "");
  const parts = url.pathname.split("/").filter(Boolean);

  if (hostname === "youtu.be") {
    return parts[0] ? youtubeEmbed(parts[0]) : null;
  }

  if (hostname === "youtube.com" || hostname === "youtube-nocookie.com") {
    const [first, second] = parts;
    if (first === "watch") {
      const v = url.searchParams.get("v");
      return v ? youtubeEmbed(v) : null;
    }
    if ((first === "live" || first === "embed" || first === "shorts") && second) {
      if (first === "embed" && second === "live_stream") return trimmed;
      return youtubeEmbed(second);
    }
    if (first === "channel" && second && YT_ID.test(second)) {
      return `https://www.youtube.com/embed/live_stream?channel=${second}&autoplay=1&mute=1`;
    }
    return trimmed;
  }

  if (hostname === "twitch.tv") {
    const channel = parts[0];
    if (channel && /^\w{1,40}$/.test(channel) && channel !== "videos") {
      if (!host) return null;
      return `https://player.twitch.tv/?channel=${channel}&parent=${encodeURIComponent(host)}&autoplay=true&muted=true`;
    }
    return trimmed;
  }

  return trimmed;
}
