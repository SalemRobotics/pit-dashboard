import type { Question } from "@/lib/types";
import { Field, inputClass, labelClass, textareaClass } from "./ui";

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

/** One field per question (names `q_<id>`), plus the optional name field. */
export function SurveyFields({ questions }: { questions: Question[] }) {
  return (
    <div className="space-y-5">
      {questions.map((q) => (
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
  );
}
