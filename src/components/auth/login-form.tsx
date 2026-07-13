"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, LogIn } from "lucide-react";
import { loginAction } from "@/server/actions/auth";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import type { Result } from "@/types/result";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      Anmelden
    </Button>
  );
}

const initialState: Result<{ redirectTo: string }> | null = null;

export function LoginForm({ redirectTarget }: { redirectTarget: string }) {
  const [state, formAction] = useActionState(loginAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;
  const formError = state && !state.success && !fieldErrors ? state.error : undefined;

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <input type="hidden" name="from" value={redirectTarget} />
      <FormField label="E-Mail" htmlFor="email" required error={fieldErrors?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="email" required autoFocus />
      </FormField>
      <FormField label="Passwort" htmlFor="password" required error={fieldErrors?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </FormField>
      {formError ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {formError}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
