"use client";

import { useEffect, useRef, useState } from "react";
import { pollVideoJobAction } from "@/server/actions/videos";

const ACTIVE_STATUSES = new Set(["QUEUED", "PROCESSING"]);

export interface PolledJobState {
  status: string;
  progress: number;
  resultUrl: string | null;
  errorMessage: string | null;
}

/** Polls the mock/live video provider every 1.5s for jobs still in flight,
 * updating local state without a full page reload. Stops automatically once
 * the job reaches a terminal status. */
export function useVideoJobPolling(
  jobs: Array<{ id: string; status: string; progress: number; resultUrl: string | null; errorMessage: string | null }>,
) {
  const [states, setStates] = useState<Record<string, PolledJobState>>(() =>
    Object.fromEntries(
      jobs.map((j) => [j.id, { status: j.status, progress: j.progress, resultUrl: j.resultUrl, errorMessage: j.errorMessage }]),
    ),
  );
  const stateRef = useRef(states);
  useEffect(() => {
    stateRef.current = states;
  });

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStates((prev) => {
      const next = { ...prev };
      for (const job of jobs) {
        if (!next[job.id]) {
          next[job.id] = {
            status: job.status,
            progress: job.progress,
            resultUrl: job.resultUrl,
            errorMessage: job.errorMessage,
          };
        }
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => j.id).join(",")]);

  useEffect(() => {
    const activeIds = jobs
      .filter((j) => ACTIVE_STATUSES.has(stateRef.current[j.id]?.status ?? j.status))
      .map((j) => j.id);

    if (activeIds.length === 0) return;

    const interval = setInterval(async () => {
      for (const id of activeIds) {
        if (!ACTIVE_STATUSES.has(stateRef.current[id]?.status ?? "")) continue;
        const result = await pollVideoJobAction(id);
        if (result.success) {
          setStates((prev) => ({
            ...prev,
            [id]: {
              status: result.data.status,
              progress: result.data.progress,
              resultUrl: result.data.resultUrl,
              errorMessage: result.data.errorMessage,
            },
          }));
        }
      }
    }, 1500);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jobs.map((j) => j.id).join(",")]);

  return states;
}
