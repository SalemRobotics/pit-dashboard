"use client";

import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useRef, useTransition, type ReactNode } from "react";
import { buttonClass, type ButtonVariant } from "./button-class";

export type ActionState = { ok: boolean; message: string } | null;

export function ActionForm({
  action,
  children,
  submitLabel,
  pendingLabel = "Working…",
  submitVariant = "primary",
  confirmMessage,
  resetOnSuccess,
  onSuccess,
  className = "",
}: {
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  children: ReactNode;
  submitLabel: string;
  pendingLabel?: string;
  submitVariant?: ButtonVariant;
  confirmMessage?: string;
  resetOnSuccess?: boolean;
  /** Called once each time the action reports success. */
  onSuccess?: () => void;
  className?: string;
}) {
  const [state, formAction, actionPending] = useActionState(action, null);
  const [transitionPending, startTransition] = useTransition();
  const pending = actionPending || transitionPending;
  const formRef = useRef<HTMLFormElement>(null);

  const handleSuccess = useEffectEvent(() => {
    if (resetOnSuccess) formRef.current?.reset();
    onSuccess?.();
  });

  useEffect(() => {
    if (state?.ok) handleSuccess();
  }, [state]);

  return (
    <form
      ref={formRef}
      className={className}
      // Submitting via startTransition (rather than the `action` prop) keeps React from
      // clearing the fields when the server returns a validation error.
      onSubmit={(e) => {
        e.preventDefault();
        if (confirmMessage && !window.confirm(confirmMessage)) return;
        const data = new FormData(e.currentTarget);
        startTransition(() => formAction(data));
      }}
    >
      {children}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button type="submit" disabled={pending} className={buttonClass({ variant: submitVariant })}>
          {pending && <Loader2 className="size-4 motion-safe:animate-spin" aria-hidden />}
          {pending ? pendingLabel : submitLabel}
        </button>
        <p role="status" aria-live="polite" className="text-[13px]">
          {state && (
            <span
              className={`inline-flex items-center gap-1.5 ${state.ok ? "text-success-ink" : "text-danger-ink"}`}
            >
              {state.ok ? (
                <CheckCircle2 className="size-4" aria-hidden />
              ) : (
                <AlertCircle className="size-4" aria-hidden />
              )}
              {state.message}
            </span>
          )}
        </p>
      </div>
    </form>
  );
}
