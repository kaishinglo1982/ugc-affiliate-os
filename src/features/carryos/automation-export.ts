import { UGC_AFFILIATE_PROCESS_TEMPLATES } from "./process-templates";
import { UGC_AFFILIATE_WORKFLOW_KEYS, UGC_AFFILIATE_WORKFLOW_MANIFESTS } from "./workflow-manifests";

export interface UgcAutomationSideEffectBinding {
  workflowKey: string;
  stepKey: string;
  adapterKind: "communication" | "publishing";
  capabilityRef: string;
  connectorRef: string;
  channel?: string;
}

export interface UgcAffiliateAutomationExport {
  schemaVersion: "1";
  pluginId: "ugc-affiliate-os";
  pluginVersion: "0.1.0";
  processTemplates: typeof UGC_AFFILIATE_PROCESS_TEMPLATES;
  workflows: typeof UGC_AFFILIATE_WORKFLOW_MANIFESTS;
  sideEffectBindings: readonly UgcAutomationSideEffectBinding[];
}

export const UGC_AFFILIATE_AUTOMATION_EXPORT: UgcAffiliateAutomationExport = {
  schemaVersion: "1",
  pluginId: "ugc-affiliate-os",
  pluginVersion: "0.1.0",
  processTemplates: UGC_AFFILIATE_PROCESS_TEMPLATES,
  workflows: UGC_AFFILIATE_WORKFLOW_MANIFESTS,
  sideEffectBindings: [
    {
      workflowKey: UGC_AFFILIATE_WORKFLOW_KEYS.assetToPublishing,
      stepKey: "publish",
      adapterKind: "publishing",
      capabilityRef: "ugc.social.publish",
      connectorRef: "social-channel",
    },
  ],
} as const;

export function validateUgcAffiliateAutomationExport(): void {
  const workflowKeys = new Set(UGC_AFFILIATE_AUTOMATION_EXPORT.workflows.map((workflow) => workflow.key));
  for (const process of UGC_AFFILIATE_AUTOMATION_EXPORT.processTemplates) {
    if (process.pluginId !== UGC_AFFILIATE_AUTOMATION_EXPORT.pluginId) throw new Error(`AUTOMATION_EXPORT_PLUGIN_MISMATCH:${process.processId}`);
    for (const step of process.steps) {
      if (!step.workflowRef || !workflowKeys.has(step.workflowRef)) throw new Error(`AUTOMATION_EXPORT_WORKFLOW_UNRESOLVED:${process.processId}:${step.stepId}`);
      if (step.externalSideEffect && !step.humanApprovalRequired) throw new Error(`AUTOMATION_EXPORT_UNAPPROVED_SIDE_EFFECT:${process.processId}:${step.stepId}`);
    }
  }
  for (const workflow of UGC_AFFILIATE_AUTOMATION_EXPORT.workflows) {
    for (const step of workflow.steps) {
      if (step.externalSideEffect && !step.approvalRequired) throw new Error(`AUTOMATION_EXPORT_UNAPPROVED_WORKFLOW_SIDE_EFFECT:${workflow.key}:${step.stepKey}`);
      if (step.externalSideEffect && !UGC_AFFILIATE_AUTOMATION_EXPORT.sideEffectBindings.some((binding) => binding.workflowKey === workflow.key && binding.stepKey === step.stepKey)) {
        throw new Error(`AUTOMATION_EXPORT_SIDE_EFFECT_BINDING_MISSING:${workflow.key}:${step.stepKey}`);
      }
    }
  }
}
