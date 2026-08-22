# ADR-003: Tenant-scoped BYO AI credentials

## Status

Accepted contract; Prisma wiring blocked by the current global integration schema.

## Decision

Live AI adapters obtain secrets only through `WorkspaceAiSecretResolver`.
The resolver requires both `workspaceId` and `providerId`, validates the scope
of the returned encrypted record, rejects mismatches before decryption and returns
no secret for disabled credentials.

## Current schema gap

The existing `Integration.providerKey` is globally unique and the legacy
`EncryptedCredential` path is not yet proven tenant-scoped. It must not be wired
directly into multi-tenant agent execution.

Before a live provider is enabled:

1. add `workspaceId` to the integration and credential ownership boundary;
2. replace global uniqueness with `@@unique([workspaceId, providerKey])`;
3. apply and force PostgreSQL RLS;
4. resolve credentials inside a workspace transaction;
5. add cross-tenant read and write negative tests;
6. audit access without logging decrypted values.

The resolver contract and its tests can be used immediately by an RLS-backed store
once the schema migration is merged.
