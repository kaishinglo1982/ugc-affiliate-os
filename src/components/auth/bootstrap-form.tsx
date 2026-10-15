"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, LogIn } from "lucide-react";
import { bootstrapAction } from "@/server/actions/auth";
import { Button } from "@/components/ui/button";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import type { Result } from "@/types/result";

const initialState: Result<{ redirectTo: string }> | null = null;

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
      Dashboard öffnen
    </Button>
  );
}

export function BootstrapForm() {
  const [state, formAction] = useActionState(bootstrapAction, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state?.success) {
      router.push(state.data.redirectTo);
      router.refresh();
    }
  }, [router, state]);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormField label="Bootstrap-Token" htmlFor="token" required>
        <Input id="token" name="token" type="password" autoComplete="one-time-code" required autoFocus />
      </FormField>
      {state && !state.success ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {state.error}
        </p>
      ) : null}
      <SubmitButton />
    </form>
  );
}
