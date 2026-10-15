import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { BootstrapForm } from "@/components/auth/bootstrap-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Bootstrap-Zugang",
  description: "Einmaliger Zugang für die initiale Dashboard-Einrichtung.",
};

export default async function BootstrapPage() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/app/dashboard");
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bootstrap-Zugang</CardTitle>
        <CardDescription>Einmaliger Zugang für die initiale Dashboard-Einrichtung.</CardDescription>
      </CardHeader>
      <CardContent>
        <BootstrapForm />
      </CardContent>
    </Card>
  );
}
