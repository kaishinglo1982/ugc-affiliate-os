# CarryOS Runtime Adapter — Phase 10

## Scope

Phase 10 establishes the first real CarryOS → UGC execution boundary.

The adapter is deliberately explicit:

- CarryOS tenant JWT is required.
- Tenant identity is verified before dispatch.
- The tenant-to-workspace binding is resolved server-side.
- Caller payloads cannot select or override a workspace.
- `carryos:workflow:execute` is required.
- Each runtime operation has an explicit required UGC capability.
- Unsupported operations fail closed.
- The adapter delegates to existing UGC domain/application services; it does not create a second workflow or agent engine.

## Implemented operations

| Operation | Capability | Delegation |
| --- | --- | --- |
| `affiliate.research` | `ugc:affiliate:research` | Product research pipeline |
| `affiliate.opportunity.score` | `ugc:opportunities:manage` | Opportunity scoring |
| `affiliate.opportunity.list` | `ugc:opportunities:manage` | Tenant-scoped opportunity query |

## Security gates

1. Missing CarryOS token → reject.
2. Invalid token → reject.
3. Missing/inactive tenant binding → reject.
4. Missing execution scope → reject.
5. Missing operation capability → reject.
6. Workspace supplied by caller → ignored; only the verified binding is used.
7. Unknown operation → reject.

No Vercel deployment is part of Phase 10. Production integration remains blocked until the global 10/10 gate.
