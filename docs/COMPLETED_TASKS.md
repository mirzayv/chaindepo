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
   - Signup as USER, CARRIER and ADMIN. **Security gap (not fixed):** `MemberInput.memberType` accepts `ADMIN` on signup with no check. If signup ever refuses ADMIN, set `memberType: 'ADMIN'` in Compass and log in again so the JWT carries the role.
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
