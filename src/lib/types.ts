export type QuestionType = "text" | "longtext" | "yesno" | "choice";

export interface Question {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  /** Only used when type === "choice". */
  options: string[];
}

/** Percentages: how much of the display the stream column / top row take up. */
export interface Layout {
  streamWidth: number;
  streamHeight: number;
}

export type ClockFormat = "12" | "24";

export interface Settings {
  eventName: string;
  streamUrl: string;
  nexusUrl: string;
  layout: Layout;
  questions: Question[];
  clockFormat: ClockFormat;
  /** Alarm volume, 0-100. */
  alarmVolume: number;
  /** Nexus API key (secret: server-side only, never send to the client). */
  nexusApiKey: string;
  /** Nexus event key, e.g. "2027casj". */
  nexusEventKey: string;
  queueAlertEnabled: boolean;
  /** Chime/voice volume, 0-100. */
  chimeVolume: number;
  /** Other audio is lowered to this percent of its volume while the alert plays, 0-100. */
  duckLevel: number;
}

export const TEAM_NUMBER = 6324;

export type Alliance = "red" | "blue";

/** What the server-side Nexus monitor currently knows. Safe to send to the client. */
export interface QueueState {
  configured: boolean;
  /** ISO time of the last successful poll. */
  lastChecked: string | null;
  error: string | null;
  /** Our next match if Nexus has it queuing; null otherwise. */
  match: { label: string; alliance: Alliance } | null;
}

export interface SurveyResponse {
  id: string;
  submittedAt: string;
  submittedBy: string;
  eventName: string;
  answers: { label: string; value: string }[];
}

export const LAYOUT_LIMITS = {
  streamWidth: { min: 25, max: 80, default: 62 },
  streamHeight: { min: 30, max: 85, default: 72 },
} as const;

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  text: "Short answer",
  longtext: "Long answer",
  yesno: "Yes / no",
  choice: "Multiple choice",
};
