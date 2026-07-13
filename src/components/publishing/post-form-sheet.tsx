"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFormStatus } from "react-dom";
import { Loader2, Send } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { savePostAction } from "@/server/actions/publishing";
import type { Result } from "@/types/result";

interface Option {
  id: string;
  label: string;
}

interface PostEditData {
  id: string;
  accountId: string;
  campaignId: string | null;
  mediaAssetId: string | null;
  caption: string;
  hashtags: string[];
  affiliateLinkText: string | null;
  disclosure: string | null;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
      Entwurf speichern
    </Button>
  );
}

export function PostFormSheet({
  open,
  onOpenChange,
  post,
  accounts,
  campaigns,
  mediaAssets,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post?: PostEditData | null;
  accounts: (Option & { platform: string })[];
  campaigns: Option[];
  mediaAssets: Option[];
}) {
  const router = useRouter();
  const saveWithId = savePostAction.bind(null, post?.id ?? null);
  const [state, formAction] = useActionState(saveWithId, null as Result<{ id: string }> | null);
  const fieldErrors = state && !state.success ? state.fieldErrors : undefined;

  useEffect(() => {
    if (state?.success) {
      onOpenChange(false);
      router.refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{post ? "Post bearbeiten" : "Post erstellen"}</SheetTitle>
          <SheetDescription>
            Veröffentlichung erfolgt nie automatisch — jeder Post durchläuft Freigabe, bevor er live geht.
          </SheetDescription>
        </SheetHeader>
        <form action={formAction} className="mt-6 space-y-4">
          <FormField label="Account" htmlFor="accountId" required error={fieldErrors?.accountId?.[0]}>
            <Select name="accountId" defaultValue={post?.accountId} required>
              <SelectTrigger id="accountId"><SelectValue placeholder="Account wählen" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.platform} · {a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Kampagne" htmlFor="campaignId">
            <Select name="campaignId" defaultValue={post?.campaignId ?? undefined}>
              <SelectTrigger id="campaignId"><SelectValue placeholder="Keine Kampagne" /></SelectTrigger>
              <SelectContent>
                {campaigns.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Medienasset" htmlFor="mediaAssetId">
            <Select name="mediaAssetId" defaultValue={post?.mediaAssetId ?? undefined}>
              <SelectTrigger id="mediaAssetId"><SelectValue placeholder="Kein Medienasset" /></SelectTrigger>
              <SelectContent>
                {mediaAssets.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField label="Caption" htmlFor="caption" required error={fieldErrors?.caption?.[0]}>
            <Textarea
              id="caption"
              name="caption"
              rows={5}
              placeholder="Ehrliche Erfahrung mit …"
              defaultValue={post?.caption}
              required
            />
          </FormField>
          <FormField label="Hashtags" htmlFor="hashtags" hint="Leerzeichen- oder kommagetrennt, # wird automatisch ergänzt.">
            <Input
              id="hashtags"
              name="hashtags"
              placeholder="#ad #empfehlung"
              defaultValue={post?.hashtags.join(" ")}
            />
          </FormField>
          <FormField label="Affiliate-Link-Text" htmlFor="affiliateLinkText" hint="Wie der Link im Post/Bio erwähnt wird.">
            <Input
              id="affiliateLinkText"
              name="affiliateLinkText"
              placeholder="Link in Bio"
              defaultValue={post?.affiliateLinkText ?? ""}
            />
          </FormField>
          <FormField label="Disclosure" htmlFor="disclosure" hint="Kennzeichnungspflicht für Werbung/Affiliate-Content.">
            <Input
              id="disclosure"
              name="disclosure"
              placeholder="Werbung / Affiliate-Link"
              defaultValue={post?.disclosure ?? "Werbung / Affiliate-Link"}
            />
          </FormField>
          {state && !state.success && !fieldErrors ? (
            <p role="alert" className="text-sm text-[var(--color-destructive)]">{state.error}</p>
          ) : null}
          <SubmitButton />
        </form>
      </SheetContent>
    </Sheet>
  );
}
