import "server-only";
import { withWorkspaceTransaction } from "@/lib/db/workspace-transaction";
import { resolveWorkspaceId } from "@/lib/auth/tenant";
import { resolveSocialProvider } from "@/lib/providers/social/mock-provider";
import { featureFlags } from "@/lib/config/feature-flags";
import { isValidPostTransition, type SocialPostStatus } from "@/features/publishing/status";
import { writeAuditLog } from "@/lib/audit/log";
import { classifyAttempt, nextRetryAt } from "@/lib/domain/publishing/job-policy";
import type { SocialAccount, SocialPost } from "@/generated/prisma/client";

export class PublishError extends Error {}
async function assertPublishingEnabled(){ if(!featureFlags.socialPublishingEnabled) throw new PublishError("Social Publishing ist derzeit deaktiviert."); }
function resolvePublisher(account: SocialAccount){ return resolveSocialProvider(account.platform); }

export async function approvePost(postId:string,actor:string):Promise<SocialPost>{
 await assertPublishingEnabled(); const workspaceId=await resolveWorkspaceId();
 const result=await withWorkspaceTransaction(workspaceId,async tx=>{
  const post=await tx.socialPost.findUnique({where:{id:postId}}); if(!post)throw new PublishError("Post nicht gefunden.");
  if(!isValidPostTransition(post.status as SocialPostStatus,"APPROVED"))throw new PublishError(`Post kann aus Status "${post.status}" nicht freigegeben werden.`);
  return tx.socialPost.update({where:{id:postId},data:{status:"APPROVED",approvedBy:actor,approvedAt:new Date()}});
 });
 await writeAuditLog({action:"social_post.approve",entityType:"SocialPost",entityId:postId,actor}); return result;
}

export async function enqueuePublish(postId:string,actor:string):Promise<SocialPost>{
 await assertPublishingEnabled(); const workspaceId=await resolveWorkspaceId();
 const result=await withWorkspaceTransaction(workspaceId,async tx=>{
  const post=await tx.socialPost.findUnique({where:{id:postId}}); if(!post)throw new PublishError("Post nicht gefunden.");
  if(post.status!=="APPROVED")throw new PublishError("Nur freigegebene Posts können veröffentlicht werden.");
  const active=await tx.publishJob.findFirst({where:{postId,status:{in:["PENDING","PROCESSING"]}},select:{id:true}});
  if(active)throw new PublishError("Für diesen Post läuft bereits ein Publish-Job.");
  await tx.publishJob.create({data:{postId,status:"PENDING"}});
  return tx.socialPost.update({where:{id:postId},data:{status:"SCHEDULED"}});
 });
 await writeAuditLog({action:"social_post.enqueue",entityType:"SocialPost",entityId:postId,actor}); return result;
}

export interface PublishWorkerReport { processed:number;succeeded:number;failed:number;deadLettered:number; }

export async function processPublishQueue(limit=10):Promise<PublishWorkerReport>{
 await assertPublishingEnabled(); const workspaceId=await resolveWorkspaceId();
 const jobs=await withWorkspaceTransaction(workspaceId,tx=>tx.publishJob.findMany({
  where:{status:{in:["PENDING","FAILED"]},nextAttemptAt:{lte:new Date()}},orderBy:{createdAt:"asc"},take:limit,
  include:{post:{include:{account:true,mediaAsset:{select:{url:true}}}}},
 }));
 const report={processed:0,succeeded:0,failed:0,deadLettered:0};
 for(const job of jobs){
  report.processed++;
  await withWorkspaceTransaction(workspaceId,tx=>tx.publishJob.update({where:{id:job.id},data:{status:"PROCESSING"}}));
  let success=false,externalPostUrl:string|undefined,errorMessage:string|undefined;
  try{const result=await resolvePublisher(job.post.account).publish({postId:job.post.id,platform:job.post.account.platform,caption:job.post.caption,hashtags:job.post.hashtags,mediaUrl:job.post.mediaAsset?.url??null});success=result.success;externalPostUrl=result.externalPostUrl;errorMessage=result.errorMessage;}
  catch(e){errorMessage=e instanceof Error?e.message:"Unbekannter Fehler";}
  const attempts=job.attempts+1,outcome=classifyAttempt(success,job.attempts);
  if(outcome==="succeeded"){await withWorkspaceTransaction(workspaceId,tx=>Promise.all([
   tx.publishJob.update({where:{id:job.id},data:{status:"SUCCEEDED",attempts,externalPostUrl:externalPostUrl??null,lastError:null,nextAttemptAt:null}}),
   tx.socialPost.update({where:{id:job.postId},data:{status:"PUBLISHED",publishedAt:new Date(),errorMessage:null,attempts:{increment:1}}}),
  ]));report.succeeded++;}
  else if(outcome==="retryable"){const nextAttemptAt=nextRetryAt(job.attempts,new Date());await withWorkspaceTransaction(workspaceId,tx=>Promise.all([
   tx.publishJob.update({where:{id:job.id},data:{status:"FAILED",attempts,lastError:errorMessage??"Fehlgeschlagen",nextAttemptAt}}),
   tx.socialPost.update({where:{id:job.postId},data:{status:"FAILED",errorMessage:errorMessage??"Fehlgeschlagen",attempts:{increment:1}}}),
  ]));report.failed++;}
  else{await withWorkspaceTransaction(workspaceId,tx=>Promise.all([
   tx.publishJob.update({where:{id:job.id},data:{status:"DEAD",attempts,lastError:errorMessage??"Endgültig fehlgeschlagen",nextAttemptAt:null}}),
   tx.socialPost.update({where:{id:job.postId},data:{status:"FAILED",errorMessage:errorMessage??"Endgültig fehlgeschlagen"}}),
  ]));report.deadLettered++;}
  await writeAuditLog({action:`social_post.publish_${outcome}`,entityType:"SocialPost",entityId:job.postId,metadata:{jobId:job.id,attempts}});
 }
 return report;
}

export async function retryDeadLetterJob(jobId:string,actor:string):Promise<void>{
 const workspaceId=await resolveWorkspaceId();
 await withWorkspaceTransaction(workspaceId,async tx=>{
  const job=await tx.publishJob.findUnique({where:{id:jobId}}); if(!job)throw new PublishError("Job nicht gefunden.");
  if(job.status!=="DEAD")throw new PublishError("Nur tote Jobs können manuell wiederholt werden.");
  await tx.publishJob.update({where:{id:jobId},data:{status:"PENDING",attempts:0,lastError:null,nextAttemptAt:null}});
 });
 await writeAuditLog({action:"social_post.job_retry",entityType:"PublishJob",entityId:jobId,actor});
}
