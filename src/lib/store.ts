import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import { LAYOUT_LIMITS, type Layout, type Question, type Settings, type SurveyResponse } from "./types";

// The systemd service points this at /var/lib/pit-display so data survives redeploys.
const DATA_DIR = process.env.PIT_DATA_DIR ?? path.join(process.cwd(), "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const RESPONSES_FILE = path.join(DATA_DIR, "survey-responses.json");

export const DEFAULT_QUESTIONS: Question[] = [
  { id: "what", label: "What needs repair?", type: "longtext", required: true, options: [] },
  {
    id: "area",
    label: "Which area is it in?",
    type: "choice",
    required: true,
    options: ["Drivetrain", "Mechanism", "Electrical", "Pneumatics", "Software", "Other"],
  },
  { id: "match", label: "Does it need to be fixed before the next match?", type: "yesno", required: true, options: [] },
];

export const DEFAULT_SETTINGS: Settings = {
  eventName: "",
  streamUrl: "",
  nexusUrl: "",
  layout: { streamWidth: LAYOUT_LIMITS.streamWidth.default, streamHeight: LAYOUT_LIMITS.streamHeight.default },
  questions: DEFAULT_QUESTIONS,
  clockFormat: "12",
  alarmVolume: 60,
  nexusApiKey: "",
  nexusEventKey: "",
  queueAlertEnabled: true,
  chimeVolume: 70,
  duckLevel: 20,
};

const pct = (v: unknown, d: number) => {
  const n = Number(v ?? d);
  return Number.isFinite(n) ? Math.min(100, Math.max(0, Math.round(n))) : d;
};

export function clampLayout(l: Partial<Layout>): Layout {
  const clamp = (v: unknown, { min, max, default: d }: { min: number; max: number; default: number }) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.round(Math.min(max, Math.max(min, n)) * 10) / 10 : d;
  };
  return {
    streamWidth: clamp(l.streamWidth, LAYOUT_LIMITS.streamWidth),
    streamHeight: clamp(l.streamHeight, LAYOUT_LIMITS.streamHeight),
  };
}

async function readJson<T>(file: string): Promise<T | null> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as T;
  } catch {
    return null;
  }
}

async function writeJson(file: string, value: unknown) {
  await mkdir(DATA_DIR, { recursive: true });
  const tmp = `${file}.tmp`;
  // 0600: settings.json holds the Nexus API key
  await writeFile(tmp, JSON.stringify(value, null, 2), { mode: 0o600 });
  await rename(tmp, file);
}

export async function readSettings(): Promise<Settings> {
  const stored = await readJson<Partial<Settings>>(SETTINGS_FILE);
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    layout: clampLayout({ ...DEFAULT_SETTINGS.layout, ...stored?.layout }),
    questions: Array.isArray(stored?.questions) ? stored.questions : DEFAULT_QUESTIONS,
    clockFormat: stored?.clockFormat === "24" ? "24" : "12",
    nexusApiKey: typeof stored?.nexusApiKey === "string" ? stored.nexusApiKey : "",
    nexusEventKey: typeof stored?.nexusEventKey === "string" ? stored.nexusEventKey : "",
    queueAlertEnabled: stored?.queueAlertEnabled !== false,
    chimeVolume: pct(stored?.chimeVolume, DEFAULT_SETTINGS.chimeVolume),
    duckLevel: pct(stored?.duckLevel, DEFAULT_SETTINGS.duckLevel),
    alarmVolume: Math.min(100, Math.max(0, Math.round(Number(stored?.alarmVolume ?? DEFAULT_SETTINGS.alarmVolume)) || 0)),
  };
}

export async function writeSettings(settings: Settings) {
  await writeJson(SETTINGS_FILE, settings);
}

export async function readResponses(): Promise<SurveyResponse[]> {
  const stored = await readJson<SurveyResponse[]>(RESPONSES_FILE);
  return Array.isArray(stored) ? stored : [];
}

export async function writeResponses(responses: SurveyResponse[]) {
  await writeJson(RESPONSES_FILE, responses);
}
