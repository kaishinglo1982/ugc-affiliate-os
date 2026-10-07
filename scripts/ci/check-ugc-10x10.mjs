#!/usr/bin/env node
import { readFileSync, existsSync } from "node:fs";
const files=["prisma/schema.prisma","prisma/migrations/20261007170000_core_bound_installation_reconciliation/migration.sql","prisma/migrations/20261007180000_workspace_rls_full_activation/migration.sql","src/lib/api/guard.ts","src/lib/db/workspace-transaction.ts","tests/security/cross-workspace-isolation.test.ts"];
const missing=files.filter(x=>!existsSync(x));
const r=readFileSync(files[2],"utf8"),t=readFileSync(files[4],"utf8");
for(const x of ["FORCE ROW LEVEL SECURITY","current_workspace_id()",'"workspaceId" = current_workspace_id()',"WITH CHECK"]) if(!r.includes(x)) missing.push(x);
for(const x of ["prisma.$transaction","set_config('app.current_workspace_id'"]) if(!t.includes(x)) missing.push(x);
if(missing.length){console.error("UGC_10X10_GATE_FAILED",missing.join(","));process.exit(1)}
console.log("UGC_10X10_STATIC_GATE_OK");