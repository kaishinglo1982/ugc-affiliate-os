"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CampaignsKanban } from "@/components/campaigns/campaigns-kanban";
import { CampaignsTable, type CampaignRow } from "@/components/campaigns/campaigns-table";

export function CampaignsView({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <Tabs defaultValue="kanban">
      <TabsList>
        <TabsTrigger value="kanban">Kanban</TabsTrigger>
        <TabsTrigger value="table">Tabelle</TabsTrigger>
      </TabsList>
      <TabsContent value="kanban">
        <CampaignsKanban campaigns={campaigns} />
      </TabsContent>
      <TabsContent value="table">
        <CampaignsTable campaigns={campaigns} />
      </TabsContent>
    </Tabs>
  );
}
