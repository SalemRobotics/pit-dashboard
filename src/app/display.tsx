"use client";

import { BatteryCharging, ExternalLink, MonitorOff, RotateCw, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition, type KeyboardEvent, type PointerEvent, type ReactNode } from "react";
import { EmbedFrame } from "@/components/embed-frame";
import { buttonClass } from "@/components/button-class";
import { Badge, EmptyState } from "@/components/ui";
import { RobotLogsPanel } from "@/components/robot-logs-panel";
import { SurveyDialog } from "@/components/survey-dialog";
import { LAYOUT_LIMITS, type Layout, type Question, type StreamStatus } from "@/lib/types";
import { saveLayout } from "./actions";

const HANDLE = 12;
type Axis = "streamWidth" | "streamHeight";

function clampAxis(axis: Axis, v: number) {
  const { min, max } = LAYOUT_LIMITS[axis];
  return Math.round(Math.min(max, Math.max(min, v)) * 10) / 10;
}

function clampLayout(l: Layout): Layout {
  return { streamWidth: clampAxis("streamWidth", l.streamWidth), streamHeight: clampAxis("streamHeight", l.streamHeight) };
}

function Panel({
  title,
  actions,
  className = "",
  children,
}: {
  title: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`flex min-h-0 min-w-0 flex-col overflow-clip rounded-card border border-line bg-surface shadow-card ${className}`}
    >
      <div className="flex h-10 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-ink">{title}</h2>
        {actions}
      </div>
      <div className="relative min-h-0 flex-1">{children}</div>
    </section>
  );
}

function SettingsLink() {
  return (
    <Link href="/settings" className={buttonClass({ variant: "secondary", size: "sm" })}>
      Open settings
    </Link>
  );
}

function EmbedBody({
  url,
  title,
  missingTitle,
  missingHint = "Add a link in settings and it will show up here.",
  inert,
}: {
  url: string;
  title: string;
  missingTitle: string;
  missingHint?: string;
  inert: boolean;
}) {
  if (!url) {
    return (
      <EmptyState
        icon={MonitorOff}
        title={missingTitle}
        description={missingHint}
        action={<SettingsLink />}
      />
    );
  }
  return (
    <EmbedFrame
      url={url}
      title={title}
      inert={inert}
      fallback={
        <EmptyState
          icon={TriangleAlert}
          title={`Can't show this ${title === "Nexus" ? "view" : "stream"}`}
          description="The link isn't one we can embed. Check it in settings."
          action={<SettingsLink />}
        />
      }
    />
  );
}

type Dragging = "x" | "y" | "both" | null;

function Handle({
  kind,
  className,
  label,
  value,
  limits,
  onDragStart,
  onDragMove,
  onDragEnd,
  onKey,
  onReset,
}: {
  kind: "x" | "y" | "both";
  className: string;
  label?: string;
  value?: number;
  limits?: { min: number; max: number };
  onDragStart: () => void;
  onDragMove: (clientX: number, clientY: number) => void;
  onDragEnd: () => void;
  onKey?: (e: KeyboardEvent<HTMLDivElement>) => void;
  onReset: () => void;
}) {
  const [active, setActive] = useState(false);
  const decorative = kind === "both";

  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setActive(true);
    onDragStart();
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (e.currentTarget.hasPointerCapture(e.pointerId)) onDragMove(e.clientX, e.clientY);
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    e.currentTarget.releasePointerCapture(e.pointerId);
    setActive(false);
    onDragEnd();
  };

  const pill =
    kind === "x" ? "h-12 w-1" : kind === "y" ? "h-1 w-12" : "size-2.5";
  const cursor = kind === "x" ? "cursor-col-resize" : kind === "y" ? "cursor-row-resize" : "cursor-move";

  return (
    <div
      {...(decorative
        ? { "aria-hidden": true, tabIndex: -1 }
        : {
            role: "separator",
            "aria-orientation": kind === "x" ? ("vertical" as const) : ("horizontal" as const),
            "aria-label": label,
            "aria-valuenow": Math.round(value ?? 0),
            "aria-valuemin": limits?.min,
            "aria-valuemax": limits?.max,
            tabIndex: 0,
          })}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onKeyDown={onKey}
      onDoubleClick={onReset}
      className={`group hidden touch-none select-none items-center justify-center rounded-full focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring md:flex ${cursor} ${className}`}
    >
      <span
        className={`rounded-full bg-accent opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 ${active ? "opacity-100" : ""} ${pill}`}
      />
    </div>
  );
}

const STREAM_REFRESH_MS = 5 * 60 * 1000;
// Nexus's own app occasionally navigates itself back to its home page (e.g. after a brief network
// drop or websocket reconnect) — nothing in our code triggers it, and the iframe is cross-origin so
// we can't tell when it happens. Periodically forcing a clean reload back to the configured URL caps
// how long the panel can be stuck on the wrong page.
const NEXUS_REFRESH_MS = 10 * 60 * 1000;

export function Display({
  initialStreamUrl,
  initialStreamSource,
  initialStreamLabel,
  nexusUrl,
  initialLayout,
  questions,
  eventName,
}: {
  initialStreamUrl: string;
  initialStreamSource: StreamStatus["source"];
  initialStreamLabel: string;
  nexusUrl: string;
  initialLayout: Layout;
  questions: Question[];
  eventName: string;
}) {
  const [stream, setStream] = useState({
    url: initialStreamUrl,
    source: initialStreamSource,
    label: initialStreamLabel,
  });
  const [layout, setLayout] = useState<Layout>(() => clampLayout(initialLayout));
  const [dragging, setDragging] = useState<Dragging>(null);
  // Bumping this remounts the Nexus iframe, forcing it to reload the configured URL from scratch.
  const [nexusReloadKey, setNexusReloadKey] = useState(0);
  const reloadNexus = useCallback(() => setNexusReloadKey((k) => k + 1), []);
  const [, startTransition] = useTransition();
  const layoutRef = useRef(layout);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let timerId: ReturnType<typeof setInterval> | null = null;
    const refresh = async () => {
      try {
        const res = await fetch("/api/stream", { cache: "no-store" });
        if (!res.ok) return;
        const next = (await res.json()) as StreamStatus;
        setStream((cur) =>
          cur.url === next.url && cur.source === next.source && cur.label === next.label
            ? cur
            : { url: next.url, source: next.source, label: next.label },
        );
      } catch {
        // Keep showing the current stream if the check fails.
      }
    };
    const stop = () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
    };
    const start = () => {
      stop();
      timerId = setInterval(refresh, STREAM_REFRESH_MS);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!nexusUrl) return;
    let timerId: ReturnType<typeof setInterval> | null = null;
    const stop = () => {
      if (timerId) clearInterval(timerId);
      timerId = null;
    };
    const start = () => {
      stop();
      timerId = setInterval(reloadNexus, NEXUS_REFRESH_MS);
    };
    const onVisibility = () => {
      // Also recover right away when the kiosk screen wakes back up, in case it drifted while hidden.
      if (document.visibilityState === "visible") {
        reloadNexus();
        start();
      } else {
        stop();
      }
    };
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [nexusUrl, reloadNexus]);

  const persist = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const next = layoutRef.current;
    startTransition(async () => {
      await saveLayout(next);
    });
  }, []);

  const persistSoon = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(persist, 400);
  }, [persist]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const update = useCallback((patch: Partial<Layout>) => {
    const next = clampLayout({ ...layoutRef.current, ...patch });
    layoutRef.current = next;
    setLayout(next);
  }, []);

  const dragTo = (axes: { x?: boolean; y?: boolean }, clientX: number, clientY: number) => {
    const el = container.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const patch: Partial<Layout> = {};
    // Subtract the handle track so the pointer stays centred on the handle.
    if (axes.x) patch.streamWidth = ((clientX - rect.left - HANDLE / 2) / (rect.width - HANDLE)) * 100;
    if (axes.y) patch.streamHeight = ((clientY - rect.top - HANDLE / 2) / (rect.height - HANDLE)) * 100;
    update(patch);
  };

  const keyFor = (e: KeyboardEvent<HTMLDivElement>, axis: Axis, dec: string, inc: string) => {
    const step = e.shiftKey ? 10 : 2;
    let delta = 0;
    if (e.key === dec) delta = -step;
    else if (e.key === inc) delta = step;
    else return;
    e.preventDefault();
    update({ [axis]: layoutRef.current[axis] + delta });
    persistSoon();
  };

  const reset = (axes: Axis[]) => {
    const patch: Partial<Layout> = {};
    for (const a of axes) patch[a] = LAYOUT_LIMITS[a].default;
    update(patch);
    persist();
  };

    const end = () => {
    setDragging(null);
    persist();
  };

  const w = layout.streamWidth;
  const h = layout.streamHeight;
  const inert = dragging !== null;

  return (
    <div
      ref={container}
      style={
        {
          "--cols": `${w}fr ${HANDLE}px ${100 - w}fr`,
          "--rows": `${h}fr ${HANDLE}px ${100 - h}fr`,
        } as React.CSSProperties
      }
      className="flex h-[calc(100dvh-57px-var(--banner-h,0px))] flex-col gap-3 overflow-y-auto p-3 md:grid md:gap-0 md:overflow-hidden md:[grid-template-columns:var(--cols)] md:[grid-template-rows:var(--rows)]"
    >
      <Panel
        title="Match stream"
        className="min-h-72 shrink-0 md:col-start-1 md:row-start-1 md:min-h-0"
        actions={
          stream.source === "auto" ? (
            <div className="flex min-w-0 items-center gap-2" title={stream.label}>
              <Badge tone="neutral">Auto</Badge>
              {stream.label && <span className="hidden truncate text-[13px] text-ink-3 md:inline">{stream.label}</span>}
              <span className="sr-only">{stream.label ? `Detected automatically: ${stream.label}` : "Detected automatically"}</span>
            </div>
          ) : undefined
        }
      >
        <EmbedBody
          url={stream.url}
          title="Match stream"
          missingTitle="No stream configured"
          missingHint="Add a link or a Blue Alliance key in settings."
          inert={inert}
        />
      </Panel>

      <Panel
        title="Nexus"
        className="min-h-96 shrink-0 md:col-start-3 md:row-start-1 md:min-h-0"
        actions={
          nexusUrl ? (
            <div className="flex items-center gap-1">
              <button
                type="button"
                aria-label="Reload Nexus"
                title="If Nexus has wandered back to its home page, this brings it back to the configured view."
                onClick={reloadNexus}
                className={buttonClass({ variant: "ghost", size: "sm", className: "!px-2" })}
              >
                <RotateCw className="size-4" aria-hidden />
              </button>
              <a
                href={nexusUrl}
                target="_blank"
                rel="noreferrer"
                className={buttonClass({ variant: "ghost", size: "sm", className: "-mr-2" })}
              >
                <ExternalLink className="size-4" aria-hidden />
                Open in new tab
              </a>
            </div>
          ) : undefined
        }
      >
        <EmbedBody key={nexusReloadKey} url={nexusUrl} title="Nexus" missingTitle="No Nexus view configured" inert={inert} />
      </Panel>

      <div className="flex shrink-0 flex-col gap-3 md:col-start-1 md:row-start-3 md:min-h-0 md:flex-row">
        <Panel title="Pit repair" className="min-h-48 md:min-h-0 md:flex-[2]">
          <div className="flex h-full flex-col items-start justify-center gap-3 p-4">
            <p className="text-[13px] text-ink-2">Something broken or needs work? Tell the pit crew so it gets fixed.</p>
            <SurveyDialog questions={questions} eventName={eventName} label="Report a repair" size="lg" />
            <Link href="/survey/responses" className={buttonClass({ variant: "ghost", size: "sm" })}>
              View reports
            </Link>
          </div>
        </Panel>
        <Panel title="Robot logs" className="min-h-48 md:min-h-0 md:flex-[3]">
          <RobotLogsPanel />
        </Panel>
      </div>

      <Panel title="Batteries" className="min-h-64 shrink-0 md:col-start-3 md:row-start-3 md:min-h-0">
        <EmptyState
          icon={BatteryCharging}
          title="Battery tracking isn't set up yet"
          description="Charge levels and swap times will show here once battery tracking is added."
        />
      </Panel>

      <Handle
        kind="x"
        label="Resize stream width"
        value={w}
        limits={LAYOUT_LIMITS.streamWidth}
        className="col-start-2 row-span-3 row-start-1"
        onDragStart={() => setDragging("x")}
        onDragMove={(x, y) => dragTo({ x: true }, x, y)}
        onDragEnd={end}
        onKey={(e) => keyFor(e, "streamWidth", "ArrowLeft", "ArrowRight")}
        onReset={() => reset(["streamWidth"])}
      />
      <Handle
        kind="y"
        label="Resize stream height"
        value={h}
        limits={LAYOUT_LIMITS.streamHeight}
        className="col-span-3 col-start-1 row-start-2"
        onDragStart={() => setDragging("y")}
        onDragMove={(x, y) => dragTo({ y: true }, x, y)}
        onDragEnd={end}
        onKey={(e) => keyFor(e, "streamHeight", "ArrowUp", "ArrowDown")}
        onReset={() => reset(["streamHeight"])}
      />
      <Handle
        kind="both"
        className="z-10 col-start-2 row-start-2"
        onDragStart={() => setDragging("both")}
        onDragMove={(x, y) => dragTo({ x: true, y: true }, x, y)}
        onDragEnd={end}
        onReset={() => reset(["streamWidth", "streamHeight"])}
      />
    </div>
  );
}
