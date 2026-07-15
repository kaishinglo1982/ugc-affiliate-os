import type { Metadata } from "next";
import { prisma } from "@/lib/db/client";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { EmptyState } from "@/components/ui/empty-state";
import { MatchActions } from "@/components/intelligence/match-actions";

export const metadata: Metadata = { title: "Match-Review" };

export default async function MatchesPage() {
  const workspaceId = await resolveWorkspaceId();
  const matches = await prisma.productMatchCandidate.findMany({
    where: { workspaceId, status: "PENDING" },
    include: { sourceOffer: true, candidateProduct: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Match-Review</h1>
        <p className="text-sm text-[var(--color-foreground-muted)]">
          {matches.length} offene Match-Kandidaten zwischen Angeboten und Produkten.
        </p>
      </div>

      <Card>
        <CardContent className="pt-5">
          {matches.length === 0 ? (
            <EmptyState title="Keine offenen Matches" description="Alle Match-Kandidaten wurden bearbeitet." />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Angebot</TableHead>
                  <TableHead>Kandidat</TableHead>
                  <TableHead>Methode</TableHead>
                  <TableHead>Konfidenz</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {matches.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.sourceOffer.title}</TableCell>
                    <TableCell>{m.candidateProduct.canonicalName}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{m.matchMethod}</Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{Number(m.confidenceScore).toFixed(2)}</TableCell>
                    <TableCell>
                      <MatchActions id={m.id} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
