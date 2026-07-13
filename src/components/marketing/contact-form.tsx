"use client";

import { useActionState, useEffect, useRef } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useFormStatus } from "react-dom";
import { submitContactAction } from "@/server/actions/contact";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import type { Result } from "@/types/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} size="lg" className="w-full sm:w-auto">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Nachricht senden
    </Button>
  );
}

const initialState: Result<{ submitted: true }> | null = null;

export function ContactForm() {
  const [state, formAction] = useActionState(submitContactAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state?.success) {
      formRef.current?.reset();
    }
  }, [state]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  if (state?.success) {
    return (
      <div
        role="status"
        className="flex flex-col items-center gap-3 rounded-lg border border-[var(--color-success)]/30 bg-[var(--color-success)]/10 px-6 py-10 text-center"
      >
        <CheckCircle2 className="h-10 w-10 text-[var(--color-success)]" />
        <p className="font-medium">Danke für deine Nachricht!</p>
        <p className="max-w-sm text-sm text-[var(--color-foreground-muted)]">
          Deine Anfrage wurde gespeichert. Ich melde mich so bald wie möglich zurück.
        </p>
      </div>
    );
  }

  return (
    <form ref={formRef} action={formAction} className="space-y-5" noValidate>
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="sr-only"
        aria-hidden="true"
      />
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField label="Name" htmlFor="name" required error={fieldErrors?.name?.[0]}>
          <Input id="name" name="name" autoComplete="name" required />
        </FormField>
        <FormField label="E-Mail" htmlFor="email" required error={fieldErrors?.email?.[0]}>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </FormField>
      </div>
      <FormField label="Betreff" htmlFor="subject" required error={fieldErrors?.subject?.[0]}>
        <Input id="subject" name="subject" required />
      </FormField>
      <FormField label="Nachricht" htmlFor="message" required error={fieldErrors?.message?.[0]}>
        <Textarea id="message" name="message" rows={6} required />
      </FormField>
      {state && !state.success && !fieldErrors ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
