# Completed Tasks: Session 2026-10-09

Branch: `modification`. The rename layer was committed **by the user** as `33b2d9e fix: modify project name into chaindepo` (on top of `4feddf1`). Claude did not commit or push anything.

## 1. Analysis (read-only)

- Mapped the monorepo: `apps/nestar-api` (GraphQL API) and `apps/nestar-batch` (cron server), the shared root `tsconfig.json` (`baseUrl: "./"`, which enables `apps/...` absolute imports), and `nest-cli.json` monorepo config with webpack.
- Catalogued the modules, GraphQL operations, Mongo collections, and every place that couples to `Property` (see [BACKEND_MIGRATION.md](BACKEND_MIGRATION.md) §5).
- Ran a case-insensitive grep for `nestar` that excluded `all_code.txt`, `uploads/`, `node_modules/`, `dist/`, `.env`. It found 15 files.
- The broader domain questions (blockchain approach, legacy scope, roles) were drafted but **deferred** by the user in favour of the rename layer.

## 2. Safe rename layer: Nestar → ChainDepo

### Renamed paths

| Old | New | Done by |
|---|---|---|
| `apps/nestar-api/` | `apps/chaindepo-api/` | User (manually; the agent's `mv` hit Windows `Access denied`) |
| `apps/nestar-batch/` | `apps/chaindepo-batch/` | User (manually) |
| `apps/chaindepo-batch/src/nestar-batch.module.ts` | `chaindepo-batch.module.ts` | Claude |
| `apps/chaindepo-batch/src/nestar-batch.controller.ts` | `chaindepo-batch.controller.ts` | Claude |
| `apps/chaindepo-batch/src/nestar-batch.service.ts` | `chaindepo-batch.service.ts` | Claude |

### Edited files

| File | Change |
|---|---|
| `nest-cli.json` | `sourceRoot`, `root`, `tsConfigPath` ×3, project keys `chaindepo-api` / `chaindepo-batch` |
| `package.json` | `name: chaindepo`; scripts `start:dev:batch`, `start:prod`, `start:prodz:batch`, `test:e2e` |
| `package-lock.json` | Root `name` (2 entries only) |
| `apps/chaindepo-api/tsconfig.app.json` | `outDir: ../../dist/apps/chaindepo-api` |
| `apps/chaindepo-batch/tsconfig.app.json` | `outDir: ../../dist/apps/chaindepo-batch` |
| `apps/chaindepo-api/src/app.service.ts` | "Welcome to ChainDepo Rest API Server!" |
| `apps/chaindepo-api/src/components/auth/guards/auth.guard.ts` | `Message` import path → `apps/chaindepo-api/...` |
| `apps/chaindepo-api/src/components/auth/guards/roles.guard.ts` | same |
| `apps/chaindepo-api/src/components/property/property.service.ts` | Header comment path only |
| `apps/chaindepo-batch/src/main.ts` | `ChainDepoBatchModule`, `LoggingInterceptor` import path, comments |
| `apps/chaindepo-batch/src/chaindepo-batch.module.ts` | Class names, schema import paths, comment |
| `apps/chaindepo-batch/src/chaindepo-batch.controller.ts` | `ChainDepoBatchController`, `chainDepoBatchService` |
| `apps/chaindepo-batch/src/chaindepo-batch.service.ts` | `ChainDepoBatchService`, DTO/enum import paths, "Welcome to ChainDepo BATCH Server" |
| `apps/chaindepo-batch/src/database/database.module.ts` | Comment only |
| `apps/chaindepo-batch/test/app.e2e-spec.ts` | Import path, `ChainDepoBatchModule`, describe title |

**Unchanged by design:** Property/Agent/Member names, all GraphQL operations, enums, schemas, collections, cron constants, `README.md`, `AGENTS.md`, `SKILLS.md`, `.env` (the user updated the Mongo DB name themselves).

## 3. Validation status

| Check | Command | Result |
|---|---|---|
| Leftover identifiers | Grep `nestar` (ignoring case; excluding ignored paths) | ✅ 0 matches |
| Typecheck API | `npx tsc --noEmit -p apps/chaindepo-api/tsconfig.app.json` | ✅ exit 0 |
| Typecheck batch | `npx tsc --noEmit -p apps/chaindepo-batch/tsconfig.app.json` | ✅ exit 0 |
| Build API | `npx nest build chaindepo-api` | ✅ webpack compiled successfully |
| Build batch | `npx nest build chaindepo-batch` | ✅ webpack compiled successfully |
| Lint | `npx eslint "apps/**/*.ts"` | ❌ **Pre-existing failure**: `Cannot find package 'typescript-eslint'` (same error before the rename; ESLint 8.57.1 with a v9 flat config) |
| Unit / e2e tests | — | ⏭ Not run (e2e needs a live MongoDB; no unit specs found) |
| Runtime smoke test: API | `npm run start:dev` (run by the user) | ✅ `chaindepo-api` started without errors; MongoDB connected; the new ChainDepo database was created with 7 collections (checked by the user in MongoDB Compass) |
| Runtime smoke test: batch | `npm run start:dev:batch` | ⏭ Not run (batch app not started) |

## 4. Git state

The rename is committed in `33b2d9e`. The only uncommitted change is this documentation:

```
?? docs/
```

## 5. Documentation (this step)

Created `docs/` with `BACKEND_MIGRATION.md`, `DECISIONS.md`, `FRONTEND_MIGRATION.md`, `COMPLETED_TASKS.md`, `NEXT_STEPS.md`, `PROMPTS.md`. No application source changed.

---

# Completed Tasks: Session 2026-10-13 (Property → Shipment domain migration)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read or changed.

`Shipment` (collection `shipments`) **replaces** `Property` in place, `MemberType.AGENT` becomes `CARRIER`, and the Like/View/Comment/Notification groups switch from `PROPERTY` to `SHIPMENT`. This is a **breaking GraphQL change** (see DECISIONS D-09, D-10, D-11). TrackingEvent was not added; it is the next phase.

## 1. Decisions taken with the user

- **USER (shipper) creates and owns shipments** (`memberId`). `carrierId` is optional and must point to an ACTIVE `CARRIER` member.
- **Member-side Agent names become Carrier names:** `getAgents` → `getCarriers`, `AgentsInquiry` → `CarriersInquiry`, `availableAgentSorts` → `availableCarrierSorts`.
- **Notification is renamed too:** `NotificationGroup.SHIPMENT`, `propertyId` → `shipmentId`.

## 2. Phases

| Phase | Work | Validation |
|---|---|---|
| 1. Additive | Shipment enum/schema/DTOs, `libs/dto/common/common.input.ts`, `availableShipmentSorts`, `generateTrackingCode`; temporary `CARRIER`/`SHIPMENT`/`memberShipments` next to the old values | ✅ tsc api + batch, `nest build chaindepo-api` |
| 2. Batch | Batch moved to the Shipment model, CARRIER members, `BATCH_TOP_SHIPMENTS` / `BATCH_TOP_CARRIERS` | ✅ tsc api + batch, both `nest build` |
| 3. API switch-over | `ShipmentModule`; Like/View/Comment re-targeted; Carrier renames; old values removed; Property files deleted | ✅ tsc api + batch, both `nest build`; grep for `propert`/`agent`/`mulk` finds only TypeScript "class property" comments |
| 4. Docs | This section, BACKEND_MIGRATION, DECISIONS, NEXT_STEPS | — |
| Fix | `npm run start:dev` failed with `multiple types named "CISearch"`: the carriers search input (renamed from `AISearch`) clashed with the comments search input. Renamed it to `CarrierISearch` in `member.input.ts`. Checked all `@InputType`/`@ObjectType` class names and `registerEnumType` names: no other duplicates | ✅ tsc api + batch, `nest build chaindepo-api` |

Lint was not run (known broken, D-06). Runtime smoke test: **not run yet** (the GraphQL schema is generated at runtime, see §6).

## 3. Files

All paths are under `apps/chaindepo-api/src/` unless they start with `apps/chaindepo-batch`.

### Created

| File | Content |
|---|---|
| `libs/enums/shipment.enum.ts` | `ShipmentType` (DOCUMENT, PARCEL, PALLET, CONTAINER), `ShipmentStatus` (CREATED, PICKED_UP, IN_TRANSIT, DELIVERED, CANCELLED, DELETE), `ShipmentLocation` (the old 9 `PropertyLocation` values) |
| `schemas/Shipment.model.ts` | Model `Shipment`, collection `shipments`, unique `shipmentTrackingCode`, optional `carrierId` and `lastEventHash`, `deliveredAt` |
| `libs/dto/shipment/shipment.ts` | `Shipment`, `Shipments` |
| `libs/dto/shipment/shipment.input.ts` | `ShipmentInput`, `WeightsRange`, `ShipmentsInquiry`, `MyShipmentsInquiry`, `AllShipmentsInquiry` |
| `libs/dto/shipment/shipment.update.ts` | `ShipmentUpdate` |
| `libs/dto/common/common.input.ts` | `OrdinaryInquiry`, `PricesRange`, `PeriodsRange` (moved out of the property DTOs) |
| `components/shipment/shipment.{module,resolver,service}.ts` | Shipment component |

### Edited

| File | Change |
|---|---|
| `libs/config.ts` | `availableCarrierSorts`, `availableShipmentSorts`, `generateTrackingCode()` (`crypto.randomBytes`, no new package); `lookupFavorite`/`lookupVisit` → `favoriteShipment`/`visitedShipment`; removed `availablePropertySorts`, `availableOptions` |
| `libs/enums/member.enum.ts` | `AGENT` → `CARRIER` |
| `libs/enums/{like,view,comment,notification}.enum.ts` | `PROPERTY` → `SHIPMENT` |
| `schemas/Member.model.ts`, `libs/dto/member/member.ts` | `memberProperties` → `memberShipments` |
| `schemas/Notification.model.ts` | `propertyId` → `shipmentId` (ref `Shipment`) |
| `libs/dto/member/member.input.ts` | `AgentsInquiry` → `CarriersInquiry` |
| `components/member/member.{service,resolver}.ts` | `getAgents` → `getCarriers`; `checkAuthRoles` allows USER and CARRIER |
| `components/like/like.service.ts` | `getFavoriteProperties` → `getFavoriteShipments` (lookup from `shipments`) |
| `components/view/view.service.ts` | `getVisitedProperties` → `getVisitedShipments` |
| `components/comment/comment.{module,service}.ts` | Depends on `ShipmentModule`; `CommentGroup.SHIPMENT` → `shipmentStatsEditor('shipmentComments')` |
| `components/components.module.ts` | `PropertyModule` → `ShipmentModule` |
| `components/board-article/board-article.resolver.ts` | Log string `getProperty` → `getBoardArticle` |
| `apps/chaindepo-batch/src/chaindepo-batch.{module,service,controller}.ts`, `lib/config.ts` | Shipment model, `batchTopShipments`, `batchTopCarriers`, new cron constants |

### Deleted

`components/property/*`, `libs/dto/property/*`, `libs/enums/property.enum.ts`, `schemas/Property.model.ts`.

## 4. GraphQL contract changes

| Old | New | Guard |
|---|---|---|
| `createProperty` | `createShipment` | USER |
| `getProperty(propertyId)` | `getShipment(shipmentId)` | optional auth |
| `updateProperty` | `updateShipment` | USER (owner) |
| `getProperties(PropertiesInquiry)` | `getShipments(ShipmentsInquiry)` | optional auth |
| `getAgentProperties` | `getMyShipments(MyShipmentsInquiry)` | USER |
| — | `getCarrierShipments(MyShipmentsInquiry)` | CARRIER |
| `getFavorites`, `getVisited` | same names, return `Shipments` | auth |
| `likeTargetProperty(propertyId)` | `likeTargetShipment(shipmentId)` | auth |
| `getAllPropertiesByAdmin` | `getAllShipmentsByAdmin` | ADMIN |
| `updatePropertyByAdmin` | `updateShipmentByAdmin` | ADMIN |
| `removePropertyByAdmin(propertyId)` | `removeShipmentByAdmin(shipmentId)` | ADMIN |
| `getAgents(AgentsInquiry)` | `getCarriers(CarriersInquiry)` | optional auth |

Removed fields and filters: beds, rooms, barter, rent, `constructedAt`, the `options`/`roomsList`/`bedsList` filters, and `squaresRange` (now `weightsRange`). New `ShipmentsInquiry.search` filters: `carrierId`, `originList`, `destinationList`, `statusList`. `text` matches the title **or** the tracking code.

## 5. Behaviour rules

- **Visibility:** public reads and likes show every status except `DELETE` (this replaces the old "ACTIVE only" rule).
- **Create:** the tracking code is generated on the server as `CD` + `YYMMDD` + 8 hex chars (e.g. `CD261013A1B2C3D4`). The shipper's `memberShipments` goes up by 1.
- **Shipper update:** only works while the shipment is `CREATED`. The shipper can only set the status to `CANCELLED` or `DELETE`. `PICKED_UP`, `IN_TRANSIT` and `DELIVERED` are reserved for the carrier / TrackingEvent phase and for admins.
- **Admin update:** works on any shipment that is not deleted and can set any status.
- **Dates:** `DELIVERED` sets `deliveredAt` and `DELETE` sets `deletedAt`. **Bug fixed:** the old Property code computed `soldAt`/`deletedAt` into local variables and never saved them.
- **Counter:** `memberShipments` goes down by 1 only on `DELETE`.
- **Batch:** carrier rank = delivered shipments assigned to the carrier ×5 + articles ×3 + likes ×2 + views. `memberShipments` counts a shipper's own shipments, so it is not used for carriers.

## 6. Pending for the user

1. **Runtime smoke test** (`npm run start:dev`, `npm run start:dev:batch`). Then in the playground: signup as USER and as CARRIER → `createShipment` with `carrierId` → `getShipments`/`getShipment` → `likeTargetShipment` → `createComment` (group `SHIPMENT`) → `getFavorites`/`getVisited` → `getMyShipments`/`getCarrierShipments` → `getCarriers`.
2. **Manual DB migration** of existing data (Claude did not run it). Without it, old `AGENT` members and `PROPERTY` likes, views and comments fail GraphQL enum serialization:
   ```js
   db.members.updateMany({ memberType: 'AGENT' }, { $set: { memberType: 'CARRIER' } });
   db.members.updateMany({ memberProperties: { $exists: true } }, { $rename: { memberProperties: 'memberShipments' } });
   db.likes.updateMany({ likeGroup: 'PROPERTY' }, { $set: { likeGroup: 'SHIPMENT' } });
   db.views.updateMany({ viewGroup: 'PROPERTY' }, { $set: { viewGroup: 'SHIPMENT' } });
   db.comments.updateMany({ commentGroup: 'PROPERTY' }, { $set: { commentGroup: 'SHIPMENT' } });
   // The old listings cannot be converted into shipments; drop or archive them:
   db.properties.drop();
   ```
   Old likes, views and comments that point to property IDs become orphans; deleting them is optional. JWTs issued before the change carry `memberType: 'AGENT'`, so those users must log in again.

---

# Completed Tasks: Session 2026-10-14 (TrackingEvent + SHA-256 hash chain)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read or changed. No packages were installed. No blockchain/ethers code (the next phase).

Every shipment status change is now an append-only `TrackingEvent` in a per-shipment SHA-256 hash chain (DECISIONS D-07 option B). `eventTxHash` stays `null` until on-chain anchoring.

## 1. Decisions taken with the user

- `claimShipment` is included: a CARRIER takes a CREATED shipment that has no `carrierId`. No chain event.
- `updateShipmentByAdmin` can no longer set lifecycle statuses (only `DELETE`). Admins use `createTrackingEvent`.
- `CANCELLED` through `createTrackingEvent` is ADMIN only. The shipper cancels through `updateShipment`. The carrier cannot cancel.
- MongoDB Atlas is a replica set, so the chain writes use **transactions** (`session.withTransaction`) instead of a compensating rollback.

## 2. Phases

| Phase | Work | Validation |
|---|---|---|
| 1. Additive | Hash helper, `TrackingEvent` schema/DTOs, `TrackingEventModule`, 2 messages | ✅ tsc api + batch, `nest build chaindepo-api` (one fix: `AppendEventInput.memberId` accepts `string` because the JWT `Member._id` is a string) |
| 2. Shipment integration | Genesis event on create, shipper cancel through the chain, admin status restriction, `getShipmentByTrackingCode`, `claimShipment` | ✅ tsc api + batch, `nest build chaindepo-api`; no duplicate GraphQL type names |
| 3. Docs | This section, BACKEND_MIGRATION §10, DECISIONS D-07/D-13, NEXT_STEPS | — |

Lint was not run (known broken, D-06). Runtime smoke test: **not run yet** (see §6).

## 3. Files

All paths are under `apps/chaindepo-api/src/`.

### Created

| File | Content |
|---|---|
| `libs/hash-chain.ts` | `GENESIS_HASH` (64 zeros), `canonicalJson` (sorted keys), `computeEventHash` (Node `crypto` SHA-256). The **only** hashing code; used by both write and verify |
| `schemas/TrackingEvent.model.ts` | Collection `trackingEvents`; index `{ shipmentId: 1, createdAt: 1 }` |
| `libs/dto/tracking-event/tracking-event.ts` | `TrackingEvent`, `ChainVerification` |
| `libs/dto/tracking-event/tracking-event.input.ts` | `TrackingEventInput` |
| `components/tracking-event/tracking-event.{module,service,resolver}.ts` | Registers both the `TrackingEvent` and `Shipment` models; does **not** import `ShipmentModule` (no circular dependency). Exports `TrackingEventService` |

### Edited

| File | Change |
|---|---|
| `libs/enums/common.enum.ts` | `Message.INVALID_STATUS_TRANSITION`, `Message.CHAIN_CONFLICT` |
| `components/components.module.ts` | Registers `TrackingEventModule` |
| `components/shipment/shipment.module.ts` | Imports `TrackingEventModule` |
| `components/shipment/shipment.service.ts` | `createShipment` in a transaction with the genesis event; `updateShipment` CANCELLED → chain event; `updateShipmentByAdmin` only `DELETE`; new `getShipmentByTrackingCode`, `claimShipment` |
| `components/shipment/shipment.resolver.ts` | `getShipmentByTrackingCode`, `claimShipment` |

## 4. GraphQL additions

| Operation | Kind | Guard |
|---|---|---|
| `createTrackingEvent(input: TrackingEventInput)` → `TrackingEvent` | Mutation | CARRIER, ADMIN |
| `getTrackingEvents(shipmentId)` → `[TrackingEvent]` (oldest first) | Query | public |
| `verifyShipmentChain(shipmentId)` → `ChainVerification { valid, totalEvents, brokenAtIndex, lastEventHash }` | Query | public |
| `getShipmentByTrackingCode(trackingCode)` → `Shipment` (no view recording, no memberData) | Query | public |
| `claimShipment(shipmentId)` → `Shipment` | Mutation | CARRIER |

**Behaviour change:** `updateShipmentByAdmin` now rejects `CREATED`/`PICKED_UP`/`IN_TRANSIT`/`DELIVERED`/`CANCELLED`.

## 5. Hash chain and status rules

- **Hash:** `eventHash = sha256(canonicalJson({ shipmentId, memberId, eventStatus, eventLocation, eventNote ?? null, createdAt.toISOString(), prevHash }))`, with ids as hex strings. `createdAt` is set explicitly before hashing (Mongoose timestamps keep an existing `createdAt`).
- **Genesis:** `createShipment` writes the shipment and a CREATED event (location = `shipmentOrigin`, prevHash = 64 zeros) in **one transaction**, and sets `shipment.lastEventHash`.
- **Append:** `prevHash = shipment.lastEventHash`. In one transaction: conditional `findOneAndUpdate({ _id, shipmentStatus, lastEventHash: prevHash })` → status, `lastEventHash`, `deliveredAt` (on DELIVERED); if it does not match → `CHAIN_CONFLICT` and nothing is saved. Then the event insert. The status condition also prevents appending after a concurrent admin soft-delete.
- **Transitions:** CREATED → PICKED_UP | CANCELLED; PICKED_UP → IN_TRANSIT | CANCELLED; IN_TRANSIT → IN_TRANSIT (different location from the previous event) | DELIVERED; nothing after DELIVERED/CANCELLED/DELETE. `CREATED` and `DELETE` cannot be sent to `createTrackingEvent`.
- **Who:** PICKED_UP / IN_TRANSIT / DELIVERED: the assigned carrier (`shipment.carrierId === authMember._id`) or ADMIN. CANCELLED: ADMIN (createTrackingEvent) or the shipper (updateShipment, only while CREATED; location = `shipmentOrigin`).
- **Verify:** events sorted `{ createdAt: 1, _id: 1 }`; at index i, `prevHash` must equal the previous `eventHash` (or genesis) and the recomputed hash must equal `eventHash`. The first failure gives `brokenAtIndex = i`. If every event is correct but the last hash differs from `shipment.lastEventHash`, then `brokenAtIndex = totalEvents`. No events → `valid: false`.
- `DELETE` (soft delete) is not a lifecycle event and writes nothing to the chain.

## 6. Pending for the user

1. **Existing data:** shipments created before this phase have no genesis event, so `createTrackingEvent` rejects them (`INVALID_STATUS_TRANSITION`). Drop or recreate the test shipments.
2. **Runtime smoke test** (`npm run start:dev`), then in the playground:
   - Signup as USER, CARRIER and ADMIN. **Security gap (fixed 2026-10-16, see the session below):** signup now refuses ADMIN. To create an admin, set `memberType: 'ADMIN'` in Compass and log in again so the JWT carries the role.
   - `createShipment` without a carrier → `getTrackingEvents` (1 CREATED event, prevHash = 64 zeros).
   - CARRIER `claimShipment` → `createTrackingEvent` PICKED_UP → IN_TRANSIT (BUSAN) → IN_TRANSIT (DAEGU) → DELIVERED (`deliveredAt` set).
   - `verifyShipmentChain` → `{ valid: true, totalEvents: 5, brokenAtIndex: null }`.
   - Negative checks: DELIVERED → IN_TRANSIT fails; a different carrier is rejected; the shipper cancels a second CREATED shipment, which writes a CANCELLED event.
   - Tamper test: edit one event's `eventNote` in Compass → `verifyShipmentChain` returns `valid: false` and that event's `brokenAtIndex`.
   - `getShipmentByTrackingCode`.

## 7. Fix: ambiguous error on repeated IN_TRANSIT (2026-10-14)

- **Report:** on shipment `6ace5092db5e552bc14ed719`, CREATED → PICKED_UP SEOUL → IN_TRANSIT DAEJON → IN_TRANSIT DAEGU returned "Invalid shipment status transition!".
- **Finding (from the running API's public queries):** the IN_TRANSIT DAEGU event **was saved** (`6ace51cedb5e552bc14ed72e`, 15:44:14Z), `shipment.lastEventHash` points to it, and `verifyShipmentChain` returns `valid: true, totalEvents: 4`. The error came from a **second** DAEGU request, which the same-location rule correctly rejected. The last-event lookup works; a `null` lookup would let the event through, not reject it.
- **Fix:** new `Message.SAME_LOCATION_AS_LAST_EVENT` for that case, so it is distinguishable from `INVALID_STATUS_TRANSITION`.
- **Validation:** ✅ tsc api + batch, `nest build chaindepo-api`.

---

# Completed Tasks: Session 2026-10-14 (anchoring on Ethereum Sepolia)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read or changed. With the user's approval, `ethers@^6` was installed (6.17.0).

Every TrackingEvent hash (genesis included) is anchored on the user's `ChainDepoAnchor` contract on Sepolia (DECISIONS D-07 option A). The tx hash is saved in `eventTxHash`.

## 1. Decisions taken with the user

- Anchoring runs in **chaindepo-api** (not the batch app), fire-and-forget, through a single in-process queue.
- "Already anchored" counts as success but stores no tx: `eventTxHash` stays `null`.
- The on-chain check is a separate query (`getEventAnchorStatuses`), not a resolved field on `TrackingEvent`.

## 2. Phases

| Phase | Work | Validation |
|---|---|---|
| 1. Dependency | `npm install ethers@^6` | — |
| 2+3. Blockchain module + integration | `BlockchainModule`/`BlockchainService`, DTOs, message, TrackingEvent/Shipment hooks, resolver. Validated together because the new required `ChainVerification.anchoredEvents` needs the service change | ✅ tsc api + batch, `nest build chaindepo-api` (twice; the second run after adding a `tx.wait` timeout) |
| 4. Docs | This section, BACKEND_MIGRATION §11, DECISIONS D-07, NEXT_STEPS | — |

Lint was not run (D-06). Runtime smoke test: **not run** (see §5).

## 3. Files

All paths are under `apps/chaindepo-api/src/`.

| File | Change |
|---|---|
| `components/blockchain/blockchain.module.ts` (new) | Provides and exports `BlockchainService` |
| `components/blockchain/blockchain.service.ts` (new) | Human-readable ABI (`anchor`, `isAnchored`, `EventAnchored`). Reads the 3 env vars; if one is missing or invalid it logs one warning that names only the variables, and disables anchoring. `JsonRpcProvider(url, 'sepolia', { staticNetwork: true })`. `anchor()` runs in a promise queue: `isAnchored` pre-check → `anchor(key, hash)` → `tx.wait(1, 180s)`; a revert "Already anchored" → `ALREADY_ANCHORED`. `isAnchored()` is read-only (outside the queue) and returns `null` on disabled or RPC error. The key and the RPC URL are never logged |
| `libs/enums/common.enum.ts` | `Message.BLOCKCHAIN_DISABLED` |
| `libs/dto/tracking-event/tracking-event.ts` | `ChainVerification.anchoredEvents` (Int, nullable), new `EventAnchorStatus` |
| `components/tracking-event/tracking-event.module.ts` | Imports `BlockchainModule` |
| `components/tracking-event/tracking-event.service.ts` | `scheduleAnchor` (fire-and-forget, errors only logged), `anchorPendingEvents`, `getEventAnchorStatuses`, `anchoredEvents` in `verifyShipmentChain`; `appendEvent` schedules the anchor after its own transaction commits |
| `components/tracking-event/tracking-event.resolver.ts` | `anchorPendingEvents`, `getEventAnchorStatuses` |
| `components/shipment/shipment.service.ts` | `createShipment` keeps the genesis event and schedules its anchor after the commit |

## 4. GraphQL additions and behaviour

| Operation | Kind | Guard |
|---|---|---|
| `anchorPendingEvents` → `Int` | Mutation | ADMIN |
| `getEventAnchorStatuses(shipmentId)` → `[EventAnchorStatus { eventId, eventHash, eventTxHash, anchored }]` | Query | public |
| `verifyShipmentChain` → adds `anchoredEvents` | Query | public |

- **Mapping:** `shipmentKey = ethers.id(String(shipmentId))`, `eventHash (bytes32) = '0x' + eventHash`.
- **When:** only after the Mongo commit. With its own transaction (`createTrackingEvent`, shipper CANCELLED), `appendEvent` schedules it; for the genesis event (external session), `createShipment` schedules it after the commit. The GraphQL response never waits on the chain.
- **Save:** `updateOne({ _id, eventTxHash: null }, { eventTxHash })`. The field is not hashed, so the chain stays valid.
- **`anchorPendingEvents`:** all events with `eventTxHash: null`, oldest first, one at a time through the same queue. It counts `ANCHORED` + `ALREADY_ANCHORED`. Other errors are logged and the loop goes on to the next event. If disabled → `BLOCKCHAIN_DISABLED`. The request lasts about one block (~12 s) per new tx.
- **`anchored` / `anchoredEvents`:** read from `isAnchored()` on-chain, not from `eventTxHash`. `null` when disabled; one event's RPC error → `anchored: null` (not counted).

## 5. Pending for the user

1. Fund the anchor wallet with Sepolia ETH. Make sure it is the contract `owner` (`onlyOwner`).
2. Smoke test (`npm run start:dev`):
   - The startup log shows `Blockchain anchoring enabled (Sepolia)`.
   - `createShipment` returns at once. About 15 s later, `getTrackingEvents` shows `eventTxHash` on the CREATED event, and Sepolia Etherscan shows `EventAnchored`.
   - Add events → `verifyShipmentChain.anchoredEvents == totalEvents`; `getEventAnchorStatuses` all `anchored: true`.
   - Set one `eventTxHash` to `null` in Compass → `anchorPendingEvents` returns ≥ 1 with no new tx (already anchored).
   - Remove one var (e.g. comment out `ANCHOR_PRIVATE_KEY`) → one warning, the app works, `anchoredEvents: null`, and `anchorPendingEvents` returns "Blockchain anchoring is disabled!".
3. Events created before this phase have `eventTxHash: null`: run `anchorPendingEvents` once as ADMIN.
4. Run a single API instance per anchor key (the queue is per process).

---

# Completed Tasks: Session 2026-10-16 (ADMIN signup block + deployment files)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read or changed. No packages were installed. Docker was **not** run, so the Docker and nginx files have not been tested.

## 1. Security: no self-service ADMIN role

| File | Change |
|---|---|
| `libs/enums/common.enum.ts` | `Message.ADMIN_SIGNUP_NOT_ALLOWED` ("Signup is allowed only as USER or CARRIER!") |
| `components/member/member.service.ts` | `signup` throws `BadRequestException(ADMIN_SIGNUP_NOT_ALLOWED)` when `memberType === ADMIN`. With no `memberType`, the schema default is still USER |
| `components/member/member.resolver.ts` | `updateMember` (any logged-in member) now drops `memberType` and `memberStatus` from the input. Before this change, a USER could promote themselves with `updateMember({ memberType: ADMIN })`. Only `updateMemberByAdmin` can change role and status |

Existing ADMIN accounts are not changed. To create a new admin: set `memberType: 'ADMIN'` in Compass, then log in again.

## 2. Deployment files

| File | Content |
|---|---|
| `apps/chaindepo-api/Dockerfile` | Multi-stage `node:20-slim` image: `npm ci` → `nest build chaindepo-api` → `npm ci --omit=dev` → runtime as user `node`, `NODE_ENV=production`, `CMD node dist/apps/chaindepo-api/main.js`. Creates `uploads/{member,shipment,article}`. Build context = repo root |
| `apps/chaindepo-batch/Dockerfile` | Same image layout for `chaindepo-batch` |
| `.dockerignore` | Excludes `node_modules`, `dist`, `.env`/`.env.*`, `uploads`, `.git`, `docs`, `all_code.txt`, … |
| `docker-compose.yml` | `api` (3007, `uploads` named volume at `/app/uploads`), `batch` (3008), `next` (built from `../chaindepo-next` with its existing Dockerfile, args `https://api.${DOMAIN}/graphql` / `wss://api.${DOMAIN}`), `nginx` (80/443). `api`/`batch` read secrets from the server `.env` via `env_file`; only `nginx` publishes ports |
| `deploy/nginx/default.conf.template` | Port 80: `/.well-known/acme-challenge/` from `/var/www/certbot`, everything else → 301 HTTPS. Port 443: `${DOMAIN}` + `www.${DOMAIN}` → `next:3000`; `api.${DOMAIN}` → `api:3007` with WebSocket `Upgrade`/`Connection` headers, 1 h timeouts, `client_max_body_size 150m`, `/uploads/` served by nginx from the volume (read-only) |

Notes:
- `PORT_API`, `PORT_BATCH` and `NODE_ENV` are pinned in compose (this overrides `.env`). Because `NODE_ENV=production`, the database module uses `MONGO_PROD`.
- MongoDB is external (Atlas). Compose has no mongo service.
- Upload `target` allow-list (fixed in the same session): `imageUploader` and `imagesUploader` reject any `target` that is not one of `validUploadTargets` (`member`, `shipment`, `article` in `libs/config.ts`), with `Message.INVALID_UPLOAD_TARGET`. Before this, a crafted value like `../../x` could write files outside `uploads/`. ✅ tsc api + batch, `nest build chaindepo-api`.

Validation: ✅ `tsc` api + batch, ✅ `nest build chaindepo-api`. Lint was not run (D-06).

## 3. Server deployment guide

Assumes Ubuntu, with DNS A records for `DOMAIN`, `www.DOMAIN` and `api.DOMAIN` pointing to the server, and ports 80/443 open.

1. **Install Docker** (Engine + Compose plugin):
   ```bash
   curl -fsSL https://get.docker.com | sudo sh
   sudo usermod -aG docker $USER   # log out and back in
   ```
2. **Clone both repos side by side**: `~/chaindepo` and `~/chaindepo-next`.
3. **Create `~/chaindepo/.env`** with the same variables as local (`MONGO_PROD`, `SECRET_TOKEN`, `SEPOLIA_RPC_URL`, `ANCHOR_CONTRACT_ADDRESS`, `ANCHOR_PRIVATE_KEY`, …) **plus** `DOMAIN=yourdomain.com`. Run `chmod 600 .env`. Never commit it.
4. **MongoDB Atlas → Network Access:** add the server's public IP. Otherwise the api and batch containers cannot connect.
5. **First certificate** (before compose starts; port 80 must be free):
   ```bash
   sudo apt install -y certbot
   sudo mkdir -p /var/www/certbot
   sudo certbot certonly --standalone -d DOMAIN -d www.DOMAIN -d api.DOMAIN
   ```
   The certificate goes to `/etc/letsencrypt/live/DOMAIN/`, which is the path nginx expects.
6. **Start the stack:**
   ```bash
   cd ~/chaindepo
   docker compose up -d --build
   docker compose logs -f api
   ```
7. **Renewal** (through the webroot, while nginx keeps running). Test once, then add it to root's crontab (`sudo crontab -e`):
   ```bash
   sudo certbot renew --dry-run --webroot -w /var/www/certbot
   # crontab: every day at 03:00
   0 3 * * * certbot renew --quiet --webroot -w /var/www/certbot --deploy-hook "docker compose -f /home/<user>/chaindepo/docker-compose.yml exec -T nginx nginx -s reload"
   ```
   The first `renew --webroot` replaces `standalone` with `webroot` in the renewal config.
8. **Existing images (optional):** copy local uploads into the volume: `docker compose cp ./uploads/. api:/app/uploads/`.

Updating after a pull: `docker compose up -d --build`. The `uploads` volume keeps its contents. Do **not** use `docker compose down -v`, because `-v` deletes the volume and all uploaded images.

---

# Completed Tasks: Session 2026-10-17 (chat socket: members only)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read.

`apps/chaindepo-api/src/socket/socket.gateway.ts`:
- A connection without a valid `?token=` (no member `_id`) is closed with code `4401 Unauthorized`. It is not added to the room, does not change the online count, and gets no `info` or `getMessages`.
- `clientsAuthMap` holds only authenticated members and acts as the room. `emitMessage`/`broadcastMessage` send to that map instead of to every socket in `server.clients`, so a socket whose token is still being verified receives nothing.
- `handleMessage` ignores sockets that are not in the map. `handleDisconnect` ignores rejected guests (no count change, no `left` broadcast).
- Logged-in members work as before. The frontend does not reconnect on close; it reopens the socket with the token on login (`reconnectChatSocket`), so a guest who logs in joins the chat.

Validation: ✅ `npm run build`.

---

# Completed Tasks: Session 2026-10-17 (AI assistant, Gemini)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read or changed. No packages were installed (uses the existing `@nestjs/axios` `HttpModule`).

## Files

All paths are under `apps/chaindepo-api/src/`.

| File | Change |
|---|---|
| `libs/dto/assistant/assistant.input.ts` (new) | `AssistantInput { message (1–500), history? }`, `AssistantHistoryInput { role: 'user' \| 'model', text (≤ 1000) }` |
| `libs/dto/assistant/assistant.ts` (new) | `AssistantAnswer { reply }` |
| `components/assistant/assistant.{module,resolver,service}.ts` (new) | `askAssistant` mutation (AuthGuard), quota, tracking context, Gemini call |
| `components/components.module.ts` | Registers `AssistantModule` |

## Behaviour

- `askAssistant(input: AssistantInput): AssistantAnswer`, members only (`AuthGuard`; guests get the existing auth error).
- Only the last 6 history items are sent to Gemini.
- **Limit:** 20 questions per member per day. Counted in an in-memory `Map` keyed by `memberId:YYYY-MM-DD` (server date; UTC in Docker). The map is cleared when the day changes and resets when the process restarts. Over the limit, the reply is "Daily assistant limit reached. Try again tomorrow."
- **Gemini:** `POST …/v1beta/models/${GEMINI_MODEL}:generateContent` with the `x-goog-api-key` header, `systemInstruction`, `contents` (history + message) and `generationConfig { maxOutputTokens: 600, temperature: 0.3 }`. Timeout 20 s.
  - For `gemini-2.5-flash*` models, the request also sends `thinkingConfig.thinkingBudget: 0`. Their thinking tokens count toward `maxOutputTokens` and can otherwise leave the reply empty.
- **Fixed replies:**
  - No `GEMINI_API_KEY` → "The assistant is not configured yet." This does not use up quota.
  - HTTP 429 → "The assistant is busy right now, please try again in a minute."
  - Any other error or an empty answer → logged on the server (status and messages only; never the axios error object, which holds the key header) → "Sorry, something went wrong."
- **Tracking context:** looks for codes matching `CD` + 6 digits + 8 hex (the `generateTrackingCode` format; case-insensitive, up to 3 per message).
  - For each code it uses `ShipmentService.getShipmentByTrackingCode`, `TrackingEventService.getTrackingEvents` and `verifyShipmentChain`.
  - It adds a block with: title, type, origin → destination, status, each event (status, location, UTC time), and whether the chain is valid. Unknown code → "not found".
  - Not included: member/carrier ids, phone, address, price, event notes, hashes.
  - The block goes into the **user** turn and is labelled as data, so the system instruction stays fixed.

## Environment

`docker-compose.yml` was not changed. The `api` service already loads the whole server `.env` through `env_file: .env`, and locally `ConfigModule.forRoot()` reads `.env`. Add to `.env`:

```
GEMINI_API_KEY=<your Google AI Studio key>
GEMINI_MODEL=gemini-2.5-flash
```

`GEMINI_MODEL` is optional (default `gemini-2.5-flash`). After editing the server `.env`, run `docker compose up -d api`; compose recreates the container because the env changed.

Validation: ✅ tsc api + batch, ✅ `npm run build`. Not run against the real Gemini API.

## Update: Gemini 3 default (2026-10-17)

Gemini returned 404: `gemini-2.5-flash` is no longer available to new users.
- The default `GEMINI_MODEL` is now `gemini-3.8-flash`.
- Models whose names start with `gemini-3` send `thinkingConfig: { thinkingLevel: 'low' }` and `maxOutputTokens: 1024`. Gemini 3 uses `thinkingLevel` instead of `thinkingBudget`, and thinking tokens count toward the output limit. The `gemini-2.5-flash*` branch (`thinkingBudget: 0`, 600 tokens) is unchanged.
- A response with no text parts logs `finishReason` (or `promptFeedback.blockReason`) as a warning and replies "Sorry, I couldn't answer that. Please rephrase." Before this, it replied "Sorry, something went wrong."
- `.env`: `GEMINI_MODEL=gemini-3.8-flash`, or remove the line to use the default. An old `GEMINI_MODEL=gemini-2.5-flash` line would keep returning 404.

Validation: ✅ `npm run build`. Not run against the real Gemini API.

## Update: plain-text replies (2026-10-17)

The system instruction now asks for plain text (no Markdown; steps as `1. ...`). As a safety net, `**` and `__` are removed from the reply before it is returned.

## Update: open to guests (2026-10-17)

- `askAssistant` uses `WithoutGuard` instead of `AuthGuard`. Guests get `memberId = null`; members are still identified by their token.
- Client IP (in `assistant.resolver.ts`): `X-Real-IP`, else the first `X-Forwarded-For` value, else the socket address. A `::ffff:` prefix is removed so IPv4 and IPv4-mapped IPv6 count as the same client.
- Daily limits (in memory, reset on a new day or on restart):
  - Members: 20 per `memberId` → "Daily assistant limit reached. Try again tomorrow."
  - Guests: 5 per IP → "You've reached the guest limit for today. Log in to ask more questions."
  - All guests together: 300 → "The assistant is busy today. Log in to keep asking."
  - The per-IP limit is checked first. A rejected question is not counted.
- `deploy/nginx/default.conf.template` already set `X-Real-IP $remote_addr` and `X-Forwarded-For $proxy_add_x_forwarded_for` for the API location. No change.
- Behind nginx, `X-Real-IP` is always overwritten, so guests cannot fake their IP. Without a proxy (local dev, or the API exposed directly), the headers can be spoofed.
- The tracking lookup is unchanged (public data only).

Validation: ✅ `npm run build`. Not run against the real Gemini API.

---

# Completed Tasks: Session 2026-10-17 (member input validation)

Branch: `modification`. Nothing was committed or pushed by Claude. `.env` was not read.

| File | Change |
|---|---|
| `libs/config.ts` | `MEMBER_{NICK,PASSWORD,PHONE}_{REGEX,MESSAGE}` and `normalizeMemberPhone` (removes spaces and dashes; a leading `+82` becomes `0`) |
| `libs/dto/member/member.input.ts` | `MemberInput`: nick `Length(3, 20)` + `^[A-Za-z0-9_]+$`; password `Length(8, 64)` + at least one letter and one digit; phone `@Transform(normalizeMemberPhone)` + `^01[016789]\d{7,8}$`. Every check on a field uses the same message. `LoginInput` is lenient: nick `Length(3, 20)`, password `Length(1, 64)`, no patterns |
| `libs/dto/member/member.update.ts` | `MemberUpdate` (self and admin update) uses the same nick/password/phone rules as signup, all optional |
| `components/member/member.service.ts` | `signup`, `updateMember` and `updateMemberByAdmin` normalize `memberPhone` before saving |
| `app.module.ts` | `formatError` also reads `extensions.originalError.message` (Apollo 4 / Nest 10). For an array of ValidationPipe messages, it returns the first one |

- The global `ValidationPipe` has no `transform: true`. Validation checks the normalized phone, but the resolver gets the raw value, so the service normalizes again. It was not enabled globally because that would change every input.
- Checked with a script (ValidationPipe on the DTOs): `+82 10-1234-5678` is accepted; a bad nick, a password without a digit and `0212345678` each return the expected single message; an old 3-char nick with a 5-char password still passes `LoginInput`.
- Existing members are not migrated. Phones saved in another format (e.g. with dashes) stay as they are, so the unique index cannot catch the same number written two ways.
- **Bug fixed (same session):** `updateMember` and `updateMemberByAdmin` saved `memberPassword` without `hashPassword`, so a password change stored plain text and that member could no longer log in. Both now hash it with `AuthService.hashPassword` (bcrypt, the same as signup) before saving. The password is never returned: the schema has `select: false` and the `Member` GraphQL type has no `memberPassword` field. Passwords already saved in plain text by the old code are not migrated; those members must reset their password (an admin can set a new one through `updateMemberByAdmin`).

Validation: ✅ tsc api + batch, ✅ `npm run build`, ✅ DTO validation script. The GraphQL error format was not checked against a running server.

## Assistant: fall back to other Gemini models when the main one is busy (2026-11-19)

Production logs showed `gemini-3.5-flash` answering `503 This model is currently experiencing high demand` and `timeout of 20000ms exceeded`, so guests saw "Sorry, something went wrong."

| File | Change |
|---|---|
| `components/assistant/assistant.service.ts` | Tries `GEMINI_MODEL` (default `gemini-3.5-flash`), then the fallbacks `GEMINI_FALLBACK_MODELS` (default `gemini-3.5-flash-lite,gemini-2.5-flash`). A 429, a 5xx or a timeout moves on to the next model; other errors stop at once. If every model was overloaded the reply is `BUSY` ("try again in a minute") instead of `FAILED`. Per-attempt timeout 13 s. `generationConfigFor(model)` keeps the thinking settings per model family |

- The fallback model names were checked against the live `models` list for the project's API key.
- The quota is still counted once per question, not per model attempt.

Validation: ✅ tsc api, ✅ `nest build chaindepo-api`. Not run against Gemini locally (no `.env` access); check on the server after deploy.
