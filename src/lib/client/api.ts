"use client";

export type MutationResult = {
  ok: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export type FetchResult<T> = {
  ok: boolean;
  data?: T;
  error?: string;
};

async function send(method: string, url: string, body?: unknown): Promise<MutationResult> {
  const res = await fetch(url, {
    method,
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as {
    error?: string;
    fieldErrors?: Record<string, string[]>;
  };
  if (!res.ok) {
    return { ok: false, error: data.error ?? "Aktion fehlgeschlagen.", fieldErrors: data.fieldErrors };
  }
  return { ok: true };
}

export function apiPost(url: string, body: unknown): Promise<MutationResult> {
  return send("POST", url, body);
}

export function apiPatch(url: string, body: unknown): Promise<MutationResult> {
  return send("PATCH", url, body);
}

export function apiDelete(url: string): Promise<MutationResult> {
  return send("DELETE", url);
}

export async function apiGet<T = unknown>(url: string): Promise<FetchResult<T>> {
  const res = await fetch(url);
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) {
    return { ok: false, error: data?.error ?? "Laden fehlgeschlagen." };
  }
  return { ok: true, data: data as T };
}
