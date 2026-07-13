import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-grid-fade px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 font-semibold">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--color-violet)] to-[var(--color-cyan)] text-white">
          <Sparkles className="h-4 w-4" />
        </span>
        UGC Affiliate OS
      </Link>
      <main id="main-content" className="w-full max-w-sm">
        {children}
      </main>
    </div>
  );
}
