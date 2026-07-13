import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Login",
  description: "Single-User-Login für das geschützte Operations-Dashboard.",
};

interface LoginPageProps {
  searchParams: Promise<{ from?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app/dashboard");
  }

  const { from } = await searchParams;
  const redirectTarget = from && from.startsWith("/app") ? from : "/app/dashboard";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Anmelden</CardTitle>
        <CardDescription>Zugang zum geschützten Operations-Dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm redirectTarget={redirectTarget} />
      </CardContent>
    </Card>
  );
}
