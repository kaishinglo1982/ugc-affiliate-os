import { z } from 'zod';

export const UgcPromptDefinitionSchema = z.object({
  id: z.string().regex(/^ugc\.[a-z0-9.-]+$/),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  platform: z.enum(['tiktok', 'instagram', 'youtube', 'cross-platform']),
  stage: z.enum(['research', 'hook', 'script', 'storyboard', 'quality']),
  requiredFacts: z.array(z.string().min(1)),
  requiresHumanApproval: z.boolean(),
  template: z.string().min(1),
});

export const UGC_PROMPT_PACK = [
  {
    id: 'ugc.hook.product-proof',
    version: '0.1.0',
    platform: 'cross-platform',
    stage: 'hook',
    requiredFacts: ['productName', 'verifiedBenefits', 'audience'],
    requiresHumanApproval: true,
    template: 'Create three hooks using only these verified facts: {{productContext}}',
  },
  {
    id: 'ugc.script.four-scenes',
    version: '0.1.0',
    platform: 'cross-platform',
    stage: 'script',
    requiredFacts: ['approvedHook', 'verifiedBenefits', 'disclosure'],
    requiresHumanApproval: true,
    template: 'Create a four-scene UGC script with an explicit affiliate disclosure: {{campaignContext}}',
  },
] as const;

export const UgcPromptPackSchema = z.array(UgcPromptDefinitionSchema);
UgcPromptPackSchema.parse(UGC_PROMPT_PACK);

export type UgcPromptDefinition = z.infer<typeof UgcPromptDefinitionSchema>;
