import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface FormFieldProps {
  label: string;
  htmlFor: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}

/** Standard label + control + hint/error layout for react-hook-form fields.
 * Keeps every form in the app visually and behaviorally consistent. */
export function FormField({
  label,
  htmlFor,
  required,
  hint,
  error,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={htmlFor}>
        {label}
        {required ? <span className="ml-0.5 text-[var(--color-destructive)]">*</span> : null}
      </Label>
      {children}
      {error ? (
        <p role="alert" className="text-sm text-[var(--color-destructive)]">
          {error}
        </p>
      ) : hint ? (
        <p className="text-sm text-[var(--color-foreground-subtle)]">{hint}</p>
      ) : null}
    </div>
  );
}
