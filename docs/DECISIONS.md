# Architectural Decisions: Nestar → ChainDepo

Format: lightweight ADRs. Status values: **Accepted** (applied), **Proposed** (recommended, not applied), **Open** (needs an owner decision).

| ID | Decision | Status |
|---|---|---|
| D-01 | Migrate in layers; the first layer is a rename-only refactor | Accepted |
| D-02 | Naming convention `chaindepo` / `ChainDepo` | Accepted |
| D-03 | Keep the GraphQL contract, Mongo collections and domain names during the rename | Accepted |
| D-04 | Use plain `mv` (not `git mv`) and never commit or push from the agent | Accepted |
| D-05 | Validate with `tsc --noEmit` + `nest build` per project; lint without `--fix` | Accepted |
| D-06 | Do not fix the broken ESLint setup inside the rename layer | Accepted |
| D-07 | Blockchain integration approach | **Open** |
| D-08 | Fate of the social modules (Like/Follow/View/BoardArticle) | **Open** |
| D-09 | Role model replacing `USER`/`AGENT`/`ADMIN` | **Open** |
| D-10 | Property → Shipment migration strategy | Proposed |
| D-11 | Rename the GraphQL operations as one coordinated breaking change | Proposed |
| D-12 | Reuse the WebSocket gateway for live tracking | Proposed |

---

## D-01: Layered migration, rename first

- **Decision:** Phase 1 changes only project and app identifiers. It changes no behaviour.
- **Why:** The rename touches build config (`nest-cli.json`, tsconfig `outDir`, npm scripts) and cross-app absolute imports. Keeping it separate from domain changes means a failed build can only come from the rename, and the diff can be reviewed in minutes.
- **Risks:** Two partially migrated states coexist for a while (ChainDepo names, Nestar domain).
- **Alternatives:** A big-bang rewrite of names and domain together was rejected because it is hard to review and to bisect.

## D-02: Naming convention

- **Decision:** `chaindepo` for lowercase/kebab identifiers (`apps/chaindepo-api`, `apps/chaindepo-batch`, package `chaindepo`, nest-cli keys). `ChainDepo` for PascalCase classes and display strings (`ChainDepoBatchService`, "Welcome to ChainDepo …"). camelCase uses `chainDepo` (`chainDepoBatchService`).
- **Why:** This was the user's explicit requirement. It matches NestJS conventions (kebab-case file and folder names, PascalCase classes).
- **Risks:** None significant. External scripts (PM2/Docker/CI) that reference the old names must be updated.

## D-03: Keep the API contract and persistence stable during the rename

- **Decision:** `Property`, `Agent`, every GraphQL query/mutation, enums, schemas and collection names stay unchanged.
- **Why:** The Next.js frontend depends on these names. Renaming them is a breaking change that has to be coordinated with the frontend (D-11), and renaming collections needs data migration.
- **Risks:** Domain terms (Property/Agent) temporarily conflict with the product name.
- **Alternatives:** GraphQL aliases or deprecated duplicate fields could bridge old and new names. They are deferred to D-11.

## D-04: Filesystem and git handling

- **Decision:** Rename with plain `mv` so that the git index is left alone. The agent never runs `git commit` or `git push`.
- **Why:** The user owns version control. Leaving changes unstaged makes review with `git status`/`git diff` easy.
- **What happened:** On Windows, renaming the folders failed with `Access denied` (probably a VS Code/TS-server handle; no node process was running). The user renamed the two folders manually, and Claude renamed the three batch files.
- **Risks:** Unstaged renames show as delete + untracked until `git add -A`, when git detects them as renames.

## D-05: Validation strategy

- **Decision:** `npx tsc --noEmit -p apps/<app>/tsconfig.app.json` for both apps, `npx nest build chaindepo-api` and `npx nest build chaindepo-batch`, then a case-insensitive grep for `nestar` that excludes ignored paths.
- **Why:** There is no `typecheck` npm script. `nest build` by project key proves that `nest-cli.json` is correct. Typechecking both apps is mandatory because the batch imports API sources.
- **Alternatives:** `npm run lint` uses `--fix`, which would add unrelated formatting changes to a rename diff, so lint ran without `--fix`.

## D-06: Leave the broken ESLint setup as it is

- **Decision:** Do not install `typescript-eslint` or change the ESLint config in the rename layer.
- **Why:** Lint already failed before the rename (`ERR_MODULE_NOT_FOUND: typescript-eslint`, captured as a baseline). Fixing it means changing dependencies, which is outside the scope of a rename.
- **Risks:** No lint gate until it is fixed.
- **Fix options:** (a) upgrade to ESLint 9 and add `typescript-eslint`, `@eslint/js`, `globals` as devDependencies; or (b) replace `eslint.config.mjs` with a `.eslintrc` for ESLint 8. Option (a) matches the existing config.

## D-07: Blockchain integration approach (OPEN)

| Option | Description | Pros | Cons / risks |
|---|---|---|---|
| A. Anchor hashes on an EVM chain (**recommended**) | MongoDB is the source of truth. Each `TrackingEvent` is hashed (e.g. keccak256 of canonical JSON) and anchored via `ethers` to a testnet (Sepolia / Polygon Amoy), individually or as batched Merkle roots from `chaindepo-batch` | Real, publicly verifiable tamper evidence; low on-chain cost with batching; fits the existing batch app | Needs RPC provider, wallet key management (env/KMS), gas, confirmation latency, retry logic |
| B. Internal hash-chain ledger | Each event stores `prevHash` (an append-only chain in Mongo) | No external dependency, quick to build | Not trustless: the operator can rewrite the whole chain |
| C. Full smart-contract state | Shipment lifecycle lives in Solidity | Maximum decentralisation | Highest effort, gas cost per event, contract upgrade complexity, slower UX |

- **Suggested path:** Implement B first (it is needed for A anyway), then add A's anchoring as a batch job. This keeps C open for later.

## D-08: Social modules (OPEN)

- Options: (1) keep and re-target Like/View/Comment/Follow/BoardArticle at shipments and carriers; (2) drop Like/Follow/BoardArticle/View and keep Comment/Notification.
- **Considerations:** Comments and notifications fit logistics (shipment notes, status alerts). Likes and follows are a weak fit, but carrier ratings or "follow a shipment" could reuse them. Removing them also removes the batch ranking jobs.

## D-09: Role model (OPEN)

- Candidates: `SHIPPER` / `CARRIER` / `ADMIN` (a 1:1 map from `USER`/`AGENT`/`ADMIN`, which is the simplest), or the same plus `WAREHOUSE` for depot check-in/out.
- **Risks:** Roles are embedded in JWT payloads (`AuthService.createToken` serialises the whole member). After a rename, existing tokens carry old role strings until users log in again, so plan a data migration of `members.memberType` plus forced re-login.

## D-10: Property → Shipment strategy (Proposed)

- Add new `Shipment` and `TrackingEvent` modules **alongside** `Property`. Move the shared DTO `OrdinaryInquiry` to a common location. Re-point Like/View/Comment at shipments. Delete Property only after the frontend has switched.
- **Why:** This keeps the API working at every step and avoids a frontend/backend deadlock.
- **Alternative:** Mutate `Property` in place into `Shipment`. This was rejected because the fields barely overlap (beds/rooms/price vs origin/destination/status).

## D-11: GraphQL rename as one coordinated breaking change (Proposed)

- Rename operations and types (e.g. `getProperties` → `getShipments`) in one release together with the frontend. During the transition, optionally keep the old operations as thin deprecated wrappers (`@Query({ deprecationReason })`).
- **Risks:** Apollo client caches and typed hooks in the frontend must be regenerated.

## D-12: WebSocket for live tracking (Proposed)

- Extend `socket.gateway.ts` (raw `ws`, token in query string) with per-shipment subscriptions that push new `TrackingEvent`s.
- **Risks:** The current gateway is a broadcast-to-all chat with an in-memory history, so it needs room/topic filtering. The token in the URL query can end up in logs.
- **Alternative:** GraphQL subscriptions (`graphql-ws`), which would need Apollo subscription configuration.
