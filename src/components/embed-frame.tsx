"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { resolveEmbedUrl } from "@/lib/embed";

const subscribe = () => () => {};
const getHost = () => window.location.hostname;
const getServerHost = () => "";

export function EmbedFrame({ url, title, inert = false, fallback = null }: { url: string; title: string; inert?: boolean; fallback?: ReactNode }) {
  const host = useSyncExternalStore(subscribe, getHost, getServerHost);
  const src = resolveEmbedUrl(url, host);
  if (!src) return <>{fallback}</>;
  return (
    <iframe
      title={title}
      src={src}
      allow="autoplay; fullscreen; picture-in-picture"
      referrerPolicy="strict-origin-when-cross-origin"
      sandbox="allow-scripts allow-same-origin allow-presentation allow-popups allow-forms"
      className={`h-full w-full border-0 bg-surface-2 ${inert ? "pointer-events-none" : ""}`}
    />
  );
}
