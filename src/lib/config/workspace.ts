/**
 * Single-tenant workspace id. The Phase 6 analytics models are workspace-scoped
 * for isolation; this system has one owner workspace. Override via env when
 * multi-tenant support is added later.
 */
export const DEFAULT_WORKSPACE_ID =
  process.env.DEFAULT_WORKSPACE_ID ?? "00000000-0000-0000-0000-000000000001";
