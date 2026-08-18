import { z } from "zod";
import { ok, parseBody, withApiContext } from "@/lib/api";
import { Permission } from "@/lib/auth/rbac";
import { writeAuditLog } from "@/lib/audit/log";
import {
  attributionTouchpointSchema,
  brandAssetSchema,
  financialForecastSchema,
  governedExportSchema,
  growthExperimentSchema,
  localizationProjectSchema,
  partnerConnectionSchema,
  reliabilityIncidentSchema,
  resolveIncidentSchema,
  scaleGateSchema,
  syndicationSchema,
} from "@/lib/validation/phase31-40";
import {
  createFinancialForecast,
  createGrowthExperiment,
  createLocalizationProject,
  createPartnerConnection,
  evaluateScaleReadiness,
  openReliabilityIncident,
  queueSyndication,
  recordAttributionTouchpoint,
  registerBrandAsset,
  requestGovernedDataExport,
  resolveReliabilityIncident,
  setScaleCertificationGate,
} from "@/server/services/phase31-40";

const commandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create_growth_experiment"), payload: growthExperimentSchema }),
  z.object({ action: z.literal("create_localization"), payload: localizationProjectSchema }),
  z.object({ action: z.literal("queue_syndication"), payload: syndicationSchema }),
  z.object({ action: z.literal("record_attribution"), payload: attributionTouchpointSchema }),
  z.object({ action: z.literal("create_forecast"), payload: financialForecastSchema }),
  z.object({ action: z.literal("register_brand_asset"), payload: brandAssetSchema }),
  z.object({ action: z.literal("create_partner"), payload: partnerConnectionSchema }),
  z.object({ action: z.literal("request_export"), payload: governedExportSchema }),
  z.object({ action: z.literal("open_incident"), payload: reliabilityIncidentSchema }),
  z.object({ action: z.literal("resolve_incident"), payload: resolveIncidentSchema }),
  z.object({ action: z.literal("set_scale_gate"), payload: scaleGateSchema }),
]);

export async function GET() {
  const auth = await withApiContext(Permission.VIEW_WORKSPACE);
  if ("response" in auth) return auth.response;
  return ok({
    readiness: await evaluateScaleReadiness(auth.context.workspaceId),
  });
}

export async function POST(request: Request) {
  const auth = await withApiContext(Permission.MANAGE_WORKSPACE);
  if ("response" in auth) return auth.response;
  const parsed = await parseBody(request, commandSchema);
  if ("response" in parsed) return parsed.response;

  const workspaceId = auth.context.workspaceId;
  const actor = auth.context.actor;
  const audit = async (action: string, entityType: string, entityId: string) =>
    writeAuditLog({
      action,
      entityType,
      entityId,
      actor,
      workspaceId,
      metadata: { command: parsed.data.action },
    });

  switch (parsed.data.action) {
    case "create_growth_experiment": {
      const experiment = await createGrowthExperiment(workspaceId, parsed.data.payload);
      await audit("growth.experiment_created", "GrowthExperimentPlan", experiment.id);
      return ok({ experiment });
    }
    case "create_localization": {
      const localization = await createLocalizationProject(workspaceId, parsed.data.payload);
      await audit("localization.project_created", "LocalizationProject", localization.id);
      return ok({ localization });
    }
    case "queue_syndication": {
      const syndication = await queueSyndication(workspaceId, parsed.data.payload);
      await audit("distribution.syndication_queued", "DistributionSyndication", syndication.id);
      return ok({ syndication });
    }
    case "record_attribution": {
      const touchpoint = await recordAttributionTouchpoint(workspaceId, parsed.data.payload);
      await audit("attribution.touchpoint_recorded", "AttributionTouchpoint", touchpoint.id);
      return ok({ touchpoint });
    }
    case "create_forecast": {
      const forecast = await createFinancialForecast(workspaceId, parsed.data.payload);
      await audit("finance.forecast_created", "FinancialForecast", forecast.id);
      return ok({ forecast });
    }
    case "register_brand_asset": {
      const asset = await registerBrandAsset(workspaceId, parsed.data.payload);
      await audit("brand.asset_registered", "BrandAssetRegistry", asset.id);
      return ok({ asset });
    }
    case "create_partner": {
      const partner = await createPartnerConnection(workspaceId, parsed.data.payload);
      await audit("partner.connection_created", "PartnerConnection", partner.id);
      return ok({ partner });
    }
    case "request_export": {
      const exportRequest = await requestGovernedDataExport(
        workspaceId,
        actor,
        parsed.data.payload,
      );
      await audit("data.export_requested", "GovernedDataExport", exportRequest.id);
      return ok({ exportRequest });
    }
    case "open_incident": {
      const incident = await openReliabilityIncident(workspaceId, parsed.data.payload);
      await audit("reliability.incident_opened", "ReliabilityIncident", incident.id);
      return ok({ incident });
    }
    case "resolve_incident": {
      const incident = await resolveReliabilityIncident(
        parsed.data.payload.id,
        workspaceId,
        parsed.data.payload.evidenceReference,
      );
      await audit("reliability.incident_resolved", "ReliabilityIncident", parsed.data.payload.id);
      return ok({ incident });
    }
    case "set_scale_gate": {
      const gate = await setScaleCertificationGate(
        workspaceId,
        actor,
        parsed.data.payload,
      );
      await audit("scale.gate_set", "ScaleCertificationGate", gate.id);
      return ok({ gate });
    }
  }
}
