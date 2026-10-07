import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { incrementMetric } from "@/lib/observability/metrics";
import type { AgentStatus, AgentRunStatus, AgentMemoryType } from "@/generated/prisma/client";
import { Prisma } from "@/generated/prisma/client";

const AGENT_LIFECYCLE_TRANSITIONS: Record<AgentStatus, readonly AgentStatus[]> = { IDLE:["RUNNING","PAUSED","ERROR"],RUNNING:["IDLE","PAUSED","ERROR"],PAUSED:["IDLE","RUNNING","ERROR"],ERROR:["IDLE","PAUSED"] };
export type AgentLifecycleStatus="registered"|"enabled"|"running"|"paused"|"disabled";
const LIFECYCLE_TO_STATUS:Record<AgentLifecycleStatus,AgentStatus>={registered:"IDLE",enabled:"IDLE",running:"RUNNING",paused:"PAUSED",disabled:"ERROR"};
export function isLifecycleStatus(value:string):value is AgentLifecycleStatus{return Object.prototype.hasOwnProperty.call(LIFECYCLE_TO_STATUS,value);}
export function canTransitionAgentStatus(from:AgentStatus,to:AgentStatus){return AGENT_LIFECYCLE_TRANSITIONS[from]?.includes(to)??false;}

export async function setAgentStatus(id:string,lifecycle:AgentLifecycleStatus,options:{workspaceId?:string}={}):Promise<AgentStatus>{
 const target=LIFECYCLE_TO_STATUS[lifecycle]; const workspaceId=options.workspaceId; if(!workspaceId)throw new Error("WORKSPACE_CONTEXT_REQUIRED");
 return withWorkspaceTransaction(workspaceId,async tx=>{
  const agent=await tx.agent.findFirst({where:{id},select:{id:true,status:true}}); if(!agent)throw new Error("AGENT_NOT_FOUND");
  if(agent.status===target)return agent.status;
  if(!canTransitionAgentStatus(agent.status,target))throw new Error(`ILLEGAL_AGENT_TRANSITION: ${agent.status} -> ${target}`);
  return (await tx.agent.update({where:{id},data:{status:target},select:{status:true}})).status;
 });
}

export type AgentCapability={name:string;version:string|null;permissions:{requiresApproval:boolean;maxCostPerCall:number|null;rateLimitPerMin:number|null;allowedAgentKeys:string[]}[]};
export async function getAgentCapabilities(workspaceId:string,filters:{enabledOnly?:boolean}={}){
 return withWorkspaceTransaction(workspaceId,tx=>tx.agentToolDefinition.findMany({where:{workspaceId,...(filters.enabledOnly?{enabled:true}:{})},orderBy:{name:"asc"},include:{policies:true}})).then(definitions=>definitions.map(def=>({name:def.name,version:def.id,permissions:def.policies.map(policy=>({requiresApproval:policy.requiresApproval,maxCostPerCall:policy.maxCostPerCall?.toNumber()??null,rateLimitPerMin:policy.rateLimitPerMin,allowedAgentKeys:policy.allowedAgentKeys}))})));
}
export type AgentRunStartInput={agentId:string;executionKey?:string;summary?:string;logs?:unknown};
export type AgentRunFinishInput={status:"SUCCESS"|"FAILED";summary?:string;logs?:unknown};
function nullableJson(value:unknown):Prisma.InputJsonValue|typeof Prisma.JsonNull{return value===undefined||value===null?Prisma.JsonNull:(value as Prisma.InputJsonValue);}
function agentRunLogs(input:AgentRunStartInput):Prisma.InputJsonValue|typeof Prisma.JsonNull{if(!input.executionKey)return nullableJson(input.logs);const base=input.logs&&typeof input.logs==="object"&&!Array.isArray(input.logs)?{...(input.logs as Record<string,unknown>)}:{};return {...base,executionKey:input.executionKey} as Prisma.InputJsonValue;}

export async function startAgentRun(input:AgentRunStartInput,options:{workspaceId?:string;incrementObservability?:boolean}={}):Promise<{id:string;status:AgentRunStatus;startedAt:Date}>{
 const workspaceId=options.workspaceId;if(!workspaceId)throw new Error("WORKSPACE_CONTEXT_REQUIRED");
 return withWorkspaceTransaction(workspaceId,async tx=>{
  if(input.executionKey){const existing=await tx.agentRun.findFirst({where:{agentId:input.agentId,status:"RUNNING",logs:{path:["executionKey"],equals:input.executionKey}},select:{id:true,status:true,startedAt:true}});if(existing)return {id:existing.id,status:existing.status as AgentRunStatus,startedAt:existing.startedAt};}
  const agent=await tx.agent.findFirst({where:{id:input.agentId},select:{id:true}});if(!agent)throw new Error("AGENT_NOT_FOUND");
  const run=await tx.agentRun.create({data:{agentId:input.agentId,status:"RUNNING",summary:input.summary??null,logs:agentRunLogs(input)},select:{id:true,status:true,startedAt:true}});
  await tx.agent.update({where:{id:input.agentId},data:{status:"RUNNING",lastRunAt:new Date()}});
  return {id:run.id,status:run.status as AgentRunStatus,startedAt:run.startedAt};
 }).then(run=>{if(options.incrementObservability??true)incrementMetric("ugc_agent_runs_total");return run;});
}

export async function finishAgentRun(runId:string,input:AgentRunFinishInput,options:{incrementObservability?:boolean}={}):Promise<{id:string;status:AgentRunStatus;finishedAt:Date|null}>{
 const workspaceId=(options as {workspaceId?:string}).workspaceId;if(!workspaceId)throw new Error("WORKSPACE_CONTEXT_REQUIRED");
 const updated=await withWorkspaceTransaction(workspaceId,async tx=>{
  const run=await tx.agentRun.findUnique({where:{id:runId},select:{id:true,status:true,agentId:true}});if(!run)throw new Error("AGENT_RUN_NOT_FOUND");
  if(run.status!=="RUNNING")return {id:run.id,status:run.status as AgentRunStatus,finishedAt:null};
  const next=await tx.agentRun.update({where:{id:runId},data:{status:input.status,summary:input.summary??undefined,...(input.logs!==undefined?{logs:nullableJson(input.logs)}:{}),finishedAt:new Date()},select:{id:true,status:true,finishedAt:true}});
  await tx.agent.update({where:{id:run.agentId},data:input.status==="SUCCESS"?{status:"IDLE",successCount:{increment:1}}:{status:"ERROR",errorCount:{increment:1}}});
  return {id:next.id,status:next.status as AgentRunStatus,finishedAt:next.finishedAt};
 });
 if(options.incrementObservability??true)incrementMetric(input.status==="SUCCESS"?"ugc_agent_runs_succeeded_total":"ugc_agent_runs_failed_total"); return updated;
}

export async function createAgentMemoryEntry(input:{workspaceId:string;agentKey:string;type?:AgentMemoryType;key:string;value?:unknown;importance?:number;expiresAt?:Date|null}){return withWorkspaceTransaction(input.workspaceId,tx=>tx.agentMemoryEntry.create({data:{workspaceId:input.workspaceId,agentKey:input.agentKey,type:input.type??"FACT",key:input.key,value:nullableJson(input.value),importance:input.importance??1,expiresAt:input.expiresAt??null}}));}
export async function getAgentMemoryEntries(workspaceId:string,agentKey:string,filters:{type?:AgentMemoryType}={}){return withWorkspaceTransaction(workspaceId,tx=>tx.agentMemoryEntry.findMany({where:{workspaceId,agentKey,...(filters.type?{type:filters.type}:{})},orderBy:[{importance:"desc"},{createdAt:"desc"}]}));}
export async function updateAgentMemoryEntry(id:string,workspaceId:string,patch:{type?:AgentMemoryType;key?:string;value?:unknown;importance?:number;expiresAt?:Date|null}){return withWorkspaceTransaction(workspaceId,tx=>tx.agentMemoryEntry.updateMany({where:{id,workspaceId},data:{...(patch.type?{type:patch.type}:{}),...(patch.key?{key:patch.key}:{}),...(patch.value!==undefined?{value:nullableJson(patch.value)}:{}),...(patch.importance!==undefined?{importance:patch.importance}:{}),...(patch.expiresAt!==undefined?{expiresAt:patch.expiresAt}:{})}}));}
export async function deleteAgentMemoryEntry(id:string,workspaceId:string){return withWorkspaceTransaction(workspaceId,tx=>tx.agentMemoryEntry.deleteMany({where:{id,workspaceId}}));}
export async function listAgents(workspaceId:string,filters?:{status?:string}){return withWorkspaceTransaction(workspaceId,tx=>tx.agent.findMany({where:{workspaceId,...(filters?.status?{status:filters.status as AgentStatus}:{})},orderBy:{createdAt:"desc"}}));}
export async function getAgent(id:string,workspaceId:string){return withWorkspaceTransaction(workspaceId,tx=>tx.agent.findFirst({where:{id,workspaceId},include:{runs:{orderBy:{startedAt:"desc"},take:10}}}));}
export async function listAgentRuns(workspaceId:string,filters?:{agentId?:string;status?:string}){return withWorkspaceTransaction(workspaceId,tx=>tx.agentRun.findMany({where:{agent:{workspaceId},...(filters?.agentId?{agentId:filters.agentId}:{}),...(filters?.status?{status:filters.status as AgentRunStatus}:{})},orderBy:{startedAt:"desc"},include:{agent:{select:{id:true,name:true,key:true}}}}));}
export async function getAgentRun(id:string,workspaceId:string){return withWorkspaceTransaction(workspaceId,tx=>tx.agentRun.findFirst({where:{id,agent:{workspaceId}},include:{agent:{select:{id:true,name:true,key:true}},toolCalls:{orderBy:{createdAt:"desc"}}}}));}
export async function listAgentTools(workspaceId:string){return withWorkspaceTransaction(workspaceId,tx=>tx.agentToolDefinition.findMany({where:{workspaceId},orderBy:{name:"asc"},include:{policies:true}}));}
