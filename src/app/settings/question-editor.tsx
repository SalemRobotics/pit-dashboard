"use client";

import { AlertTriangle, ChevronDown, ChevronUp, ListChecks, Plus, Trash2 } from "lucide-react";
import { useId, useState } from "react";
import { buttonClass } from "@/components/button-class";
import { EmptyState, Field, inputClass, selectClass, textareaClass } from "@/components/ui";
import { isNameLikeLabel, QUESTION_TYPE_LABELS, type Question, type QuestionType } from "@/lib/types";

const MAX_QUESTIONS = 30;

interface Row {
  id: string;
  label: string;
  type: QuestionType;
  required: boolean;
  /** Raw textarea text, kept separate so trailing newlines survive while typing. */
  optionsText: string;
}

function newId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

function parseOptions(text: string) {
  return text
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function QuestionEditor({ initial }: { initial: Question[] }) {
  const [rows, setRows] = useState<Row[]>(() =>
    initial.map((q) => ({
      id: q.id,
      label: q.label,
      type: q.type,
      required: q.required,
      optionsText: q.options.join("\n"),
    })),
  );
  const uid = useId();

  const update = (id: string, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  const move = (index: number, dir: -1 | 1) =>
    setRows((rs) => {
      const next = [...rs];
      const target = index + dir;
      if (target < 0 || target >= next.length) return rs;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  const remove = (id: string) => setRows((rs) => rs.filter((r) => r.id !== id));
  const add = () =>
    setRows((rs) =>
      rs.length >= MAX_QUESTIONS
        ? rs
        : [...rs, { id: newId(), label: "", type: "text", required: false, optionsText: "" }],
    );

  const serialized = JSON.stringify(
    rows.map((r) => ({
      id: r.id,
      label: r.label,
      type: r.type,
      required: r.required,
      options: r.type === "choice" ? parseOptions(r.optionsText) : [],
    })),
  );

  const iconBtn = buttonClass({ variant: "ghost", size: "sm", className: "!px-2" });

  return (
    <div>
      <input type="hidden" name="questions" value={serialized} />

      {rows.length === 0 ? (
        <div className="rounded-control border border-dashed border-line-strong">
          <EmptyState
            icon={ListChecks}
            title="No questions yet"
            description="Add at least one question so teams have something to answer."
          />
        </div>
      ) : (
        <ol className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const base = `${uid}-${row.id}`;
            return (
              <li key={row.id} className="rounded-control border border-line bg-surface-2 p-3">
                <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                  <Field label="Question" htmlFor={`${base}-label`}>
                    <input
                      id={`${base}-label`}
                      type="text"
                      className={inputClass}
                      value={row.label}
                      maxLength={200}
                      placeholder="What needs fixing?"
                      onChange={(e) => update(row.id, { label: e.target.value })}
                    />
                    {isNameLikeLabel(row.label) && (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] text-warning-ink">
                        <AlertTriangle className="size-4 shrink-0" aria-hidden />
                        Every report already asks for the reporter&apos;s name separately — this question duplicates
                        it and can&apos;t be saved.
                      </p>
                    )}
                  </Field>
                  <Field label="Answer type" htmlFor={`${base}-type`}>
                    <select
                      id={`${base}-type`}
                      className={selectClass}
                      value={row.type}
                      onChange={(e) => update(row.id, { type: e.target.value as QuestionType })}
                    >
                      {(Object.keys(QUESTION_TYPE_LABELS) as QuestionType[]).map((t) => (
                        <option key={t} value={t}>
                          {QUESTION_TYPE_LABELS[t]}
                        </option>
                      ))}
                    </select>
                  </Field>
                </div>

                {row.type === "choice" && (
                  <div className="mt-3">
                    <Field
                      label="Options (one per line)"
                      htmlFor={`${base}-options`}
                      hint="Add at least two options."
                    >
                      <textarea
                        id={`${base}-options`}
                        className={textareaClass}
                        value={row.optionsText}
                        rows={4}
                        onChange={(e) => update(row.id, { optionsText: e.target.value })}
                      />
                    </Field>
                  </div>
                )}

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                  <label htmlFor={`${base}-required`} className="inline-flex items-center gap-2 text-sm text-ink">
                    <input
                      id={`${base}-required`}
                      type="checkbox"
                      className="size-4 accent-accent"
                      checked={row.required}
                      onChange={(e) => update(row.id, { required: e.target.checked })}
                    />
                    Required
                  </label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Move question ${i + 1} up`}
                      disabled={i === 0}
                      onClick={() => move(i, -1)}
                    >
                      <ChevronUp className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Move question ${i + 1} down`}
                      disabled={i === rows.length - 1}
                      onClick={() => move(i, 1)}
                    >
                      <ChevronDown className="size-4" aria-hidden />
                    </button>
                    <button
                      type="button"
                      className={iconBtn}
                      aria-label={`Remove question ${i + 1}`}
                      onClick={() => remove(row.id)}
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <button type="button" className={buttonClass({ variant: "secondary" })} onClick={add} disabled={rows.length >= MAX_QUESTIONS}>
          <Plus className="size-4" aria-hidden />
          Add question
        </button>
        <span className="text-[13px] tabular-nums text-ink-3">
          {rows.length} of {MAX_QUESTIONS} questions
        </span>
      </div>
    </div>
  );
}
