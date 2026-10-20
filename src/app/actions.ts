"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import type { ActionState } from "@/components/action-form";
import { clampLayout, readResponses, readSettings, writeResponses, writeSettings } from "@/lib/store";
import { LAYOUT_LIMITS, type Layout, type Question, type QuestionType } from "@/lib/types";

const fail = (message: string): ActionState => ({ ok: false, message });
const ok = (message: string): ActionState => ({ ok: true, message });
const str = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

function validUrl(raw: string) {
  if (!raw) return true;
  try {
    const u = new URL(raw);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export async function saveDisplaySettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const eventName = str(fd.get("eventName")).slice(0, 120);
  const streamUrl = str(fd.get("streamUrl"));
  const nexusUrl = str(fd.get("nexusUrl"));
  if (!validUrl(streamUrl)) return fail("The stream URL must start with http:// or https://.");
  if (!validUrl(nexusUrl)) return fail("The Nexus URL must start with http:// or https://.");
  await writeSettings({ ...(await readSettings()), eventName, streamUrl, nexusUrl });
  revalidatePath("/", "layout");
  return ok("Display settings saved.");
}

export async function saveLayoutSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const { streamWidth: w, streamHeight: h } = LAYOUT_LIMITS;
  const width = Number(fd.get("streamWidth"));
  const height = Number(fd.get("streamHeight"));
  if (!Number.isFinite(width) || width < w.min || width > w.max)
    return fail(`Stream width must be between ${w.min}% and ${w.max}%.`);
  if (!Number.isFinite(height) || height < h.min || height > h.max)
    return fail(`Stream height must be between ${h.min}% and ${h.max}%.`);
  await writeSettings({ ...(await readSettings()), layout: clampLayout({ streamWidth: width, streamHeight: height }) });
  revalidatePath("/", "layout");
  return ok("Layout saved.");
}

export async function saveClockSettings(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const clockFormat = str(fd.get("clockFormat"));
  if (clockFormat !== "12" && clockFormat !== "24") return fail("Pick a 12-hour or 24-hour clock.");
  const volume = Number(fd.get("alarmVolume"));
  if (!Number.isInteger(volume) || volume < 0 || volume > 100) return fail("Alarm volume must be between 0 and 100.");
  await writeSettings({ ...(await readSettings()), clockFormat, alarmVolume: volume });
  revalidatePath("/", "layout");
  return ok("Clock and alarm settings saved.");
}

/** Called directly from the display when a panel divider is dragged. */
export async function saveLayout(layout: Layout): Promise<void> {
  await writeSettings({ ...(await readSettings()), layout: clampLayout(layout) });
}

const QUESTION_TYPES: QuestionType[] = ["text", "longtext", "yesno", "choice"];

export async function saveSurveyQuestions(_prev: ActionState, fd: FormData): Promise<ActionState> {
  let raw: unknown;
  try {
    raw = JSON.parse(str(fd.get("questions")));
  } catch {
    return fail("Couldn't read the questions. Reload the page and try again.");
  }
  if (!Array.isArray(raw)) return fail("Couldn't read the questions. Reload the page and try again.");
  if (raw.length > 30) return fail("A survey can have at most 30 questions.");

  const questions: Question[] = [];
  for (const [i, q] of raw.entries()) {
    const label = typeof q?.label === "string" ? q.label.trim().slice(0, 200) : "";
    if (!label) return fail(`Question ${i + 1} needs some text.`);
    const type: QuestionType = QUESTION_TYPES.includes(q.type) ? q.type : "text";
    const options: string[] =
      type === "choice" && Array.isArray(q.options)
        ? q.options.map((o: unknown) => String(o).trim().slice(0, 100)).filter(Boolean).slice(0, 20)
        : [];
    if (type === "choice" && options.length < 2) return fail(`Question ${i + 1} needs at least two options.`);
    const id = typeof q.id === "string" && /^[\w-]{1,40}$/.test(q.id) ? q.id : randomUUID();
    if (questions.some((x) => x.id === id)) return fail("Duplicate question found. Reload the page and try again.");
    questions.push({ id, label, type, required: Boolean(q.required), options });
  }
  await writeSettings({ ...(await readSettings()), questions });
  revalidatePath("/", "layout");
  return ok("Survey questions saved.");
}

export async function submitSurvey(_prev: ActionState, fd: FormData): Promise<ActionState> {
  const settings = await readSettings();
  const answers: { label: string; value: string }[] = [];
  for (const q of settings.questions) {
    const value = str(fd.get(`q_${q.id}`)).slice(0, 2000);
    if (!value) {
      if (q.required) return fail(`Please answer “${q.label}”.`);
    } else if (q.type === "yesno" && value !== "Yes" && value !== "No") {
      return fail(`Please answer “${q.label}” with yes or no.`);
    } else if (q.type === "choice" && !q.options.includes(value)) {
      return fail(`Please pick one of the options for “${q.label}”.`);
    }
    answers.push({ label: q.label, value });
  }
  if (!answers.some((a) => a.value)) return fail("Fill in at least one answer before sending.");

  const responses = await readResponses();
  responses.unshift({
    id: randomUUID(),
    submittedAt: new Date().toISOString(),
    submittedBy: str(fd.get("submittedBy")).slice(0, 80),
    eventName: settings.eventName,
    answers,
  });
  await writeResponses(responses.slice(0, 1000));
  revalidatePath("/survey/responses");
  return ok("Report sent. The pit crew will see it right away.");
}

export async function clearSurveyResponses(): Promise<ActionState> {
  await writeResponses([]);
  revalidatePath("/survey/responses");
  return ok("All reports deleted.");
}
