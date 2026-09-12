import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";

const allowedVerifierKeys = new Set(["required-tools", "forbidden-tools", "citations", "approval", "tenant", "output-includes", "latency", "cost"]);
const governedMetrics = new Set(["tool_compliance", "approval_compliance", "tenant_isolation"]);

function fail(code) { throw new Error(code); }
function obj(value, code) { if (!value || typeof value !== "object" || Array.isArray(value)) fail(code); return value; }
function arr(value, code) { if (!Array.isArray(value)) fail(code); return value; }
function str(value, code) { if (typeof value !== "string" || value.trim().length === 0) fail(code); return value; }

function validateSuite(raw, agentCatalogSource) {
  obj(raw, "EVAL_SUITE_NOT_OBJECT");
  const id = str(raw.id, "EVAL_SUITE_ID");
  str(raw.version, `EVAL_SUITE_VERSION:${id}`);
  const target = obj(raw.target, `EVAL_TARGET:${id}`);
  if (target.type !== "AGENT") fail(`EVAL_TARGET_TYPE:${id}`);
  const targetKey = str(target.key, `EVAL_TARGET_KEY:${id}`);
  if (!agentCatalogSource.includes(`key: "${targetKey}"`)) fail(`EVAL_TARGET_AGENT_NOT_REGISTERED:${targetKey}`);
  if (raw.minPassRate !== 1) fail(`EVAL_PASS_RATE_MUST_BE_ONE:${id}`);
  const metricKeys = new Set();
  for (const rawMetric of arr(raw.metrics, `EVAL_METRICS:${id}`)) {
    const metric = obj(rawMetric, `EVAL_METRIC:${id}`);
    const key = str(metric.key, `EVAL_METRIC_KEY:${id}`);
    if (metricKeys.has(key)) fail(`EVAL_DUPLICATE_METRIC:${id}:${key}`);
    metricKeys.add(key);
    if (typeof metric.threshold !== "number" || metric.threshold < 0 || metric.threshold > 1) fail(`EVAL_METRIC_THRESHOLD:${id}:${key}`);
    if (governedMetrics.has(key) && metric.zeroTolerance !== true) fail(`EVAL_ZERO_TOLERANCE_REQUIRED:${id}:${key}`);
  }
  const taskIds = new Set();
  const tasks = arr(raw.tasks, `EVAL_TASKS:${id}`);
  if (tasks.length === 0) fail(`EVAL_TASKS_EMPTY:${id}`);
  for (const rawTask of tasks) {
    const task = obj(rawTask, `EVAL_TASK:${id}`);
    const taskId = str(task.id, `EVAL_TASK_ID:${id}`);
    if (taskIds.has(taskId)) fail(`EVAL_DUPLICATE_TASK:${id}:${taskId}`);
    taskIds.add(taskId);
    str(task.instruction, `EVAL_TASK_INSTRUCTION:${id}:${taskId}`);
    for (const verifier of arr(task.verifierKeys, `EVAL_VERIFIERS:${id}:${taskId}`)) {
      if (!allowedVerifierKeys.has(str(verifier, `EVAL_VERIFIER:${id}:${taskId}`))) fail(`EVAL_UNKNOWN_VERIFIER:${id}:${verifier}`);
    }
  }
  return id;
}

const root = process.cwd();
const suiteDir = join(root, "evaluation", "suites");
const [files, seedSource] = await Promise.all([readdir(suiteDir), readFile(join(root, "prisma", "seed.ts"), "utf8")]);
const suiteFiles = files.filter((file) => file.endsWith(".json")).sort();
if (suiteFiles.length < 5) fail(`EVAL_SUITE_COUNT_TOO_LOW:${suiteFiles.length}`);
const ids = new Set();
for (const file of suiteFiles) {
  const id = validateSuite(JSON.parse(await readFile(join(suiteDir, file), "utf8")), seedSource);
  if (ids.has(id)) fail(`EVAL_SUITE_ID_DUPLICATE:${id}`);
  ids.add(id);
}
console.log(`UGC CarryOS EvalKit contract: ${ids.size} real suites validated; no synthetic PASS baseline emitted.`);
