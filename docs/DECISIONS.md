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
| D-07 | Blockchain integration approach | Accepted (B + A applied 2026-10-14: hash chain anchored on Sepolia) |
| D-08 | Fate of the social modules (Like/Follow/View/BoardArticle) | **Partially accepted** (kept and re-targeted at shipments) |
| D-09 | Role model replacing `USER`/`AGENT`/`ADMIN` | Accepted (`USER` = shipper, `CARRIER`, `ADMIN`) |
| D-10 | Property → Shipment migration strategy | Accepted (in-place replacement) |
| D-11 | Rename the GraphQL operations as one coordinated breaking change | Accepted (no deprecated wrappers) |
| D-12 | Reuse the WebSocket gateway for live tracking | Proposed |
| D-13 | Every lifecycle status change goes through the hash chain | Accepted |

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

## D-07: Blockchain integration approach (Accepted 2026-10-14: B + A)

| Option | Description | Pros | Cons / risks |
|---|---|---|---|
| A. Anchor hashes on an EVM chain (**recommended**) | MongoDB is the source of truth. Each `TrackingEvent` is hashed (e.g. keccak256 of canonical JSON) and anchored via `ethers` to a testnet (Sepolia / Polygon Amoy), individually or as batched Merkle roots from `chaindepo-batch` | Real, publicly verifiable tamper evidence; low on-chain cost with batching; fits the existing batch app | Needs RPC provider, wallet key management (env/KMS), gas, confirmation latency, retry logic |
| B. Internal hash-chain ledger | Each event stores `prevHash` (an append-only chain in Mongo) | No external dependency, quick to build | Not trustless: the operator can rewrite the whole chain |
| C. Full smart-contract state | Shipment lifecycle lives in Solidity | Maximum decentralisation | Highest effort, gas cost per event, contract upgrade complexity, slower UX |

- **Suggested path:** Implement B first (it is needed for A anyway), then add A's anchoring as a batch job. This keeps C open for later.
- **Outcome (2026-10-14):** B is implemented. SHA-256 (Node `crypto`) over canonical JSON with sorted keys, genesis prevHash = 64 zeros, `shipment.lastEventHash` as the chain tip, conditional update + event insert in one Mongo transaction (Atlas replica set). `eventTxHash` is reserved for A. A (ethers anchoring) is the next phase.
- **Outcome A (2026-10-14):** every event is anchored individually (no Merkle batching) on the `ChainDepoAnchor` contract on Ethereum Sepolia, through `ethers` v6, from **chaindepo-api** (not the batch app). `shipmentKey = ethers.id(shipmentId)`, `eventHash = '0x' + sha256 hex`. Anchoring is fire-and-forget after the Mongo commit and goes through a single in-process queue (each tx waits for 1 confirmation before the next is sent). The ADMIN mutation `anchorPendingEvents` backfills. If the env vars are missing, anchoring is disabled with one warning and the app still works.
- **Risks (A):** the queue is per process, so running several API instances with the same key would collide on nonces. Anchors still queued at a restart are lost; `anchorPendingEvents` recovers them. An event found "Already anchored" keeps `eventTxHash: null` (counted as anchored; the on-chain check is the source of truth). Each anchor costs Sepolia gas from the anchor wallet.

## D-08: Social modules (OPEN)

- Options: (1) keep and re-target Like/View/Comment/Follow/BoardArticle at shipments and carriers; (2) drop Like/Follow/BoardArticle/View and keep Comment/Notification.
- **Considerations:** Comments and notifications fit logistics (shipment notes, status alerts). Likes and follows are a weak fit, but carrier ratings or "follow a shipment" could reuse them. Removing them also removes the batch ranking jobs.
- **Outcome (2026-10-13):** For now, Like/View/Comment/Notification are kept and re-targeted (`*Group.SHIPMENT`). The batch ranks shipments and carriers. Follow and BoardArticle are unchanged. Whether to drop any of them is still open.

## D-09: Role model (Accepted 2026-10-13)

- **Decision:** `MemberType` = `USER` (the shipper; the value keeps its name), `CARRIER` (was `AGENT`), `ADMIN`. A USER creates and owns shipments (`memberId`). A CARRIER is assigned through the optional `Shipment.carrierId`, which must be an ACTIVE CARRIER. `WAREHOUSE` is not added.
- **Member operations:** `getAgents` → `getCarriers`, `AgentsInquiry` → `CarriersInquiry`.
- **Risks:** Roles are embedded in JWT payloads (`AuthService.createToken` serialises the whole member). Existing tokens carry `AGENT` until users log in again. `members.memberType` must be migrated manually (commands are in [COMPLETED_TASKS.md](COMPLETED_TASKS.md), 2026-10-13 §6).

## D-10: Property → Shipment strategy (Accepted 2026-10-13: in-place replacement)

- **Original proposal:** add `Shipment` alongside `Property` and delete Property only after the frontend has switched.
- **Decision (user):** `Shipment` **replaces** `Property`. The Property module, DTOs, enum and schema were deleted in the same change. `OrdinaryInquiry`, `PricesRange` and `PeriodsRange` moved to `libs/dto/common/common.input.ts`. Like/View/Comment were re-pointed at shipments. The domain fields were redesigned rather than mutated: origin/destination, weight, tracking code, carrierId, lastEventHash.
- **Consequence:** the Nestar frontend no longer works against this API until it migrates (D-11). TrackingEvent is a separate, later step.

## D-11: GraphQL rename as one coordinated breaking change (Accepted 2026-10-13)

- **Decision:** the operations and types were renamed in one breaking change, with **no** deprecated wrappers. The full rename table is in [COMPLETED_TASKS.md](COMPLETED_TASKS.md) (2026-10-13 §4).
- **Risks:** Apollo client caches and typed hooks in the frontend must be regenerated.

## D-12: WebSocket for live tracking (Proposed)

- Extend `socket.gateway.ts` (raw `ws`, token in query string) with per-shipment subscriptions that push new `TrackingEvent`s.
- **Risks:** The current gateway is a broadcast-to-all chat with an in-memory history, so it needs room/topic filtering. The token in the URL query can end up in logs.
- **Alternative:** GraphQL subscriptions (`graphql-ws`), which would need Apollo subscription configuration.

## D-13: Every lifecycle status change goes through the hash chain (Accepted 2026-10-14)

- **Decision:** `CREATED` (genesis), `PICKED_UP`, `IN_TRANSIT`, `DELIVERED` and `CANCELLED` are only set by `TrackingEventService.appendEvent`. `updateShipmentByAdmin` accepts only `DELETE` (soft delete, not a lifecycle event). Admins use `createTrackingEvent`. The shipper's `CANCELLED` in `updateShipment` writes a chain event too. `CANCELLED` through `createTrackingEvent` is ADMIN only. Carriers can `claimShipment` an unassigned CREATED shipment (no chain event).
- **Why:** If any path changed `shipmentStatus` outside the chain, the chain would disagree with the shipment and the verification would be meaningless.
- **Risks:** Shipments created before 2026-10-14 have no genesis event and cannot receive events. Admin corrections of a wrong status are impossible by design (the chain is append-only); a future "correction" event type could cover this.
