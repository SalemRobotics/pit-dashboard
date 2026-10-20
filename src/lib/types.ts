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

export interface Settings {
  eventName: string;
  streamUrl: string;
  nexusUrl: string;
  layout: Layout;
  questions: Question[];
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
