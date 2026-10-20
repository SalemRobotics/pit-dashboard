import { ClipboardList } from "lucide-react";
import { connection } from "next/server";
import Link from "next/link";
import { ActionForm } from "@/components/action-form";
import { buttonClass } from "@/components/button-class";
import { Card, Container, EmptyState, Field, PageHeader, inputClass, labelClass, textareaClass } from "@/components/ui";
import { submitSurvey } from "@/app/actions";
import { readSettings } from "@/lib/store";
import type { Question } from "@/lib/types";

export const metadata = { title: "Pit repair survey" };

const chipClass =
  "flex min-h-10 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-surface px-3.5 text-sm text-ink shadow-xs transition hover:bg-surface-hover has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-ring";

function Required() {
  return <span className="ml-1.5 font-normal text-ink-3">Required</span>;
}

function RadioGroup({ q, options }: { q: Question; options: string[] }) {
  return (
    <fieldset>
      <legend className={labelClass}>
        {q.label}
        {q.required && <Required />}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((opt, i) => (
          <label key={opt} htmlFor={`q_${q.id}_${i}`} className={chipClass}>
            <input
              type="radio"
              id={`q_${q.id}_${i}`}
              name={`q_${q.id}`}
              value={opt}
              required={q.required}
              className="size-4 accent-accent"
            />
            {opt}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function QuestionField({ q }: { q: Question }) {
  const id = `q_${q.id}`;
  const label = (
    <>
      {q.label}
      {q.required && <Required />}
    </>
  );
  if (q.type === "yesno") return <RadioGroup q={q} options={["Yes", "No"]} />;
  if (q.type === "choice") {
    if (q.options.length <= 6) return <RadioGroup q={q} options={q.options} />;
    return (
      <div>
        <label htmlFor={id} className={labelClass}>
          {label}
        </label>
        <select id={id} name={id} required={q.required} defaultValue="" className={inputClass}>
          <option value="" disabled={q.required}>
            Choose one
          </option>
          {q.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }
  return (
    <div>
      <label htmlFor={id} className={labelClass}>
        {label}
      </label>
      {q.type === "longtext" ? (
        <textarea id={id} name={id} required={q.required} rows={4} className={textareaClass} />
      ) : (
        <input id={id} name={id} type="text" required={q.required} className={inputClass} />
      )}
    </div>
  );
}

export default async function SurveyPage() {
  await connection();
  const settings = await readSettings();

  return (
    <Container className="max-w-2xl">
      <PageHeader
        eyebrow={settings.eventName || undefined}
        title="Pit repair survey"
        subtitle="Tell the pit crew what needs fixing."
        actions={
          <Link href="/survey/responses" className={buttonClass({ variant: "ghost" })}>
            View reports
          </Link>
        }
      />
      <Card>
        {settings.questions.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No survey questions yet"
            description="Add some questions in settings so the team can send repair reports."
            action={
              <Link href="/settings" className={buttonClass({ variant: "secondary" })}>
                Set up questions
              </Link>
            }
          />
        ) : (
          <ActionForm action={submitSurvey} submitLabel="Send report" pendingLabel="Sending…" resetOnSuccess>
            <div className="space-y-5">
              {settings.questions.map((q) => (
                <QuestionField key={q.id} q={q} />
              ))}
              <Field label="Your name (optional)" htmlFor="submittedBy">
                <input
                  id="submittedBy"
                  name="submittedBy"
                  type="text"
                  autoComplete="name"
                  maxLength={80}
                  className={inputClass}
                />
              </Field>
            </div>
          </ActionForm>
        )}
      </Card>
    </Container>
  );
}
