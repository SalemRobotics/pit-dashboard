"use client";

import { CheckCircle2, ClipboardList, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { submitSurvey } from "@/app/actions";
import type { Question } from "@/lib/types";
import { ActionForm } from "./action-form";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./button-class";
import { SurveyFields } from "./survey-fields";
import { EmptyState } from "./ui";

/**
 * The pit repair survey as a modal. The standards doc says "no modal dialogs", but the team
 * explicitly asked for the survey to open over the current page instead of navigating away.
 */
export function SurveyDialog({
  questions,
  eventName,
  label,
  variant = "primary",
  size = "md",
}: {
  questions: Question[];
  eventName?: string;
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const sentTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => () => void (sentTimer.current && clearTimeout(sentTimer.current)), []);

  function handleSent() {
    setOpen(false);
    setSent(true);
    if (sentTimer.current) clearTimeout(sentTimer.current);
    sentTimer.current = setTimeout(() => setSent(false), 5000);
  }

  return (
    <>
      <button
        type="button"
        className={buttonClass({ variant, size })}
        aria-haspopup="dialog"
        onClick={() => {
          setSent(false);
          setOpen(true);
        }}
      >
        {label}
      </button>
      <span role="status" aria-live="polite" className="text-[13px]">
        {sent && (
          <span className="inline-flex items-center gap-1.5 text-success-ink">
            <CheckCircle2 className="size-4" aria-hidden />
            Report sent
          </span>
        )}
      </span>

      <dialog
        ref={dialogRef}
        aria-labelledby="survey-title"
        // Escape and the close button both end up here; keep React state in sync.
        onClose={() => setOpen(false)}
        className="m-auto max-h-[92dvh] w-[min(94vw,40rem)] animate-pop-in overflow-y-auto rounded-panel border border-line bg-surface text-ink shadow-pop backdrop:bg-black/60"
      >
        {open && (
          <div className="p-6">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div className="min-w-0">
                {eventName && (
                  <p className="mb-1 text-[11px] font-medium uppercase tracking-[0.12em] text-ink-3">{eventName}</p>
                )}
                <h2 id="survey-title" className="text-[1.375rem] font-semibold tracking-[-0.02em]">
                  Pit repair survey
                </h2>
                <p className="mt-1 text-[13px] text-ink-2">Tell the pit crew what needs fixing.</p>
              </div>
              <button
                type="button"
                aria-label="Close survey"
                className={buttonClass({ variant: "ghost", size: "sm", className: "!px-2" })}
                onClick={() => setOpen(false)}
              >
                <X className="size-5" aria-hidden />
              </button>
            </div>

            {questions.length === 0 ? (
              <EmptyState
                icon={ClipboardList}
                title="No survey questions yet"
                description="Add some questions in settings so the team can send repair reports."
                action={
                  <Link
                    href="/settings"
                    className={buttonClass({ variant: "secondary" })}
                    onClick={() => setOpen(false)}
                  >
                    Set up questions
                  </Link>
                }
              />
            ) : (
              <ActionForm
                action={submitSurvey}
                submitLabel="Send report"
                pendingLabel="Sending…"
                onSuccess={handleSent}
              >
                <SurveyFields questions={questions} />
              </ActionForm>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}
