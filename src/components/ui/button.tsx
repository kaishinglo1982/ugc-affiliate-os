import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-colors duration-[var(--motion-duration-fast)] ease-[var(--motion-ease-out)] disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--color-background)] [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)] hover:brightness-110 active:brightness-95",
        accent:
          "bg-[var(--color-accent)] text-[var(--color-accent-foreground)] shadow-[var(--shadow-sm)] hover:brightness-110",
        secondary:
          "bg-[var(--color-surface-raised)] text-[var(--color-foreground)] border border-[var(--color-border)] hover:bg-[var(--color-surface-overlay)]",
        outline:
          "border border-[var(--color-border-strong)] bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)]",
        ghost: "bg-transparent text-[var(--color-foreground)] hover:bg-[var(--color-surface-raised)]",
        destructive:
          "bg-[var(--color-destructive)] text-white hover:brightness-110",
        link: "text-[var(--color-primary)] underline-offset-4 hover:underline p-0 h-auto",
      },
      size: {
        sm: "h-9 px-3 text-sm",
        md: "h-11 px-4 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "h-11 w-11",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
