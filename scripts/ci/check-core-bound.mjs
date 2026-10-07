#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
const required=["prisma/schema.prisma","prisma/migrations/20261007170000_core_bound_installation_reconciliation/migration.sql","src/lib/auth/carryos-plugin-binding.ts","src/lib/api/guard.ts"];
const bad=required.filter(p=>!existsSync(p));
const schema=readFileSync("prisma/schema.prisma","utf8"), guard=readFileSync("src/lib/api/guard.ts","utf8"), binding=readFileSync("src/lib/auth/carryos-plugin-binding.ts","utf8");
for(const x of ["model CarryOsPluginBinding","model AgentCapabilityRegistration","model AgentCapacityReservation"]) if(!schema.includes(x)) bad.push(x);
for(const x of ["requireCarryOsUgcBinding","resolveCarryOsTenantId"]) if(!guard.includes(x)) bad.push(x);
for(const x of ["ACTIVE","servicePrincipalId","pluginInstallationId","revokedAt"]) if(!binding.includes(x)) bad.push(x);
if(bad.length){console.error("UGC_CORE_BOUND_GATE_FAILED",bad.join(","));process.exit(1)}
console.log("UGC_CORE_BOUND_GATE_OK");