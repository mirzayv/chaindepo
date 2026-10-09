# Prompts: Nestar → ChainDepo Migration

## 1. Useful prompts from this session

### 1.1 Initial analysis (plan mode)

```text
Analyze the current Nestar monorepo structure to transform the existing NestJS monorepo Nestar
platform into ChainDepo, a blockchain-based logistics tracking platform. Stay in plan mode and
do not change any files. Ignore all_code.txt, uploads/, node_modules/ and dist/. Do not read .env.
```

### 1.2 Safe rename layer (the one that was executed)

```text
Safe rename layer (no business logic change).
Rename all visible project/app identifiers from Nestar to ChainDepo. Use "chaindepo" for lowercase
identifiers (apps/chaindepo-api, apps/chaindepo-batch, package name) and "ChainDepo" for display
strings. Do not change domain logic. Keep APIs and database collections unchanged. Do not rename
Property, Agent, or any GraphQL operation. Update package names and environment label constants.
Ignore all_code.txt, uploads/, node_modules/ and dist/. Do not read or modify .env, I already
updated the Mongo database name myself. Run lint and typecheck after refactoring. Do not run git
commit or git push. Please make a plan first.
```

Why it worked: explicit scope, an explicit list of things not to rename, ignored paths, a ban on `.env`, required validation, no git writes, and plan first.

### 1.3 Documentation snapshot

```text
Create a new folder: docs ... BACKEND_MIGRATION.md, DECISIONS.md, FRONTEND_MIGRATION.md,
COMPLETED_TASKS.md, NEXT_STEPS.md, PROMPTS.md ... Do not change application source code.
Only create documentation files. Do not read or modify .env. Do not run git commit or git push.
```

## 2. Standard guardrails (append to every prompt)

```text
Constraints:
- Read docs/BACKEND_MIGRATION.md, docs/DECISIONS.md and docs/NEXT_STEPS.md first.
- Ignore all_code.txt, uploads/, node_modules/ and dist/. Do not read or modify .env.
- Do not run git commit or git push.
- Make a plan first and wait for approval.
- After changes run:
    npx tsc --noEmit -p apps/chaindepo-api/tsconfig.app.json
    npx tsc --noEmit -p apps/chaindepo-batch/tsconfig.app.json
    npx nest build chaindepo-api && npx nest build chaindepo-batch
  (chaindepo-batch imports API sources, so always typecheck both.)
- Lint without --fix; report pre-existing failures, don't mask them.
- Update docs/COMPLETED_TASKS.md and docs/NEXT_STEPS.md at the end.
```

## 3. Reusable prompts for the next session

### 3.1 Resume and verify the state

```text
Read docs/*.md. Verify the repository matches docs/COMPLETED_TASKS.md (folder names, nest-cli
keys, no "nestar" identifiers outside ignored paths, both apps typecheck). Report any drift. Do not
change files.
```

### 3.2 Fix ESLint (dependency change, needs approval)

```text
Lint fails with "Cannot find package 'typescript-eslint'" (ESLint 8.57.1 + flat config
eslint.config.mjs). Propose the minimal fix (ESLint 9 + typescript-eslint + @eslint/js + globals
as devDependencies, or a legacy .eslintrc). Plan first. After approval, install, run
`npx eslint "apps/**/*.ts"` WITHOUT --fix, and summarise the errors by rule. Do not auto-fix
source files. Add a "typecheck" npm script for both apps.
```

### 3.3 Record open decisions

```text
Help me decide D-07 (blockchain approach), D-08 (social modules) and D-09 (roles) from
docs/DECISIONS.md. Ask me one question per decision with your recommendation, then update
DECISIONS.md with the outcomes (status Accepted, rationale, risks). Documentation only.
```

### 3.4 Scaffold the Shipment domain (additive, non-breaking)

```text
Domain layer step 1 (additive only). Add ShipmentModule and TrackingEventModule to
apps/chaindepo-api following the existing Property module patterns (code-first GraphQL DTOs with
class-validator, Mongoose schema in src/schemas, $facet list + metaCounter pagination, guards
@Roles/@UseGuards, AuthMember decorator, helpers from libs/config.ts). Collections: shipments,
trackingEvents (append-only, fields hash and prevHash). Roles per docs/DECISIONS.md D-09. Do NOT
modify or remove Property, Agent, or existing GraphQL operations. Move OrdinaryInquiry to a shared
libs/dto/common location and update imports. Plan first.
```

### 3.5 Decouple Comment/Like/View from Property

```text
Re-target CommentModule, LikeModule and ViewModule so they support SHIPMENT alongside PROPERTY
(add enum values; add shipment stats editor). Remove CommentModule's hard dependency on
PropertyModule via a group-to-stats-editor dispatch. Keep all existing GraphQL operations working.
Plan first; typecheck and build both apps.
```

### 3.6 Blockchain hash-chain layer

```text
Implement the ledger per docs/DECISIONS.md D-07. Step 1: a deterministic hashing service
(canonical JSON → keccak256/sha256) and the prevHash chain on TrackingEvent creation, plus a
verifyShipmentChain query that detects tampering. Add unit tests for determinism and tamper
detection. No on-chain calls yet. Plan first.
```

### 3.7 On-chain anchoring job (option A)

```text
Add an anchoring job to chaindepo-batch: batch unanchored TrackingEvent hashes into a Merkle root
and submit it to an EVM testnet via ethers. RPC URL and signer key come from new env vars that I
will add myself (do not read or edit .env; list the variable names I need). Store txHash and
anchoredAt on events. Retries with backoff. Plan first.
```

### 3.8 Coordinated GraphQL rename (breaking)

```text
Using the rename table in docs/FRONTEND_MIGRATION.md §3, add the new shipment-named operations and
mark the old Property operations with deprecationReason (keep them working). Produce a schema diff
(old vs new generated schema) and a frontend checklist. Plan first.
```

### 3.9 Frontend migration kickoff (run in the Next.js repo)

```text
This is the Nestar Next.js frontend being migrated to ChainDepo (blockchain logistics tracking).
Read ../chaindepo/docs/FRONTEND_MIGRATION.md. Verify the page/component mapping against this repo
and produce a corrected mapping table plus an inventory of all gql documents and DTO-mirroring
types. Do not change files.
```

### 3.10 End-of-session documentation update

```text
Update docs/COMPLETED_TASKS.md (append a dated section with files changed and validation results)
and docs/NEXT_STEPS.md (re-prioritise). Documentation only; no source changes, no git commit/push.
```
