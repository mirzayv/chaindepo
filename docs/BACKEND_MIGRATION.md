# Backend Migration: Nestar → ChainDepo

> Status as of 2026-10-14 (branch `modification`). Phase 1 (the safe rename layer) is done. **Domain layer, step 1 is done:** `Shipment` replaced `Property` in place, `AGENT` became `CARRIER`, and the GraphQL operations were renamed (breaking). **Domain layer, step 2 is done:** `TrackingEvent` with a SHA-256 hash chain (§10). On-chain anchoring is next. Details are in [COMPLETED_TASKS.md](COMPLETED_TASKS.md). Sections 4–8 below describe the state after the rename layer; the later changes are summarised in §9 and §10.

## 1. Original project: Nestar

Nestar is a real-estate listing platform built as a NestJS 10 GraphQL monorepo.

| Aspect | Detail |
|---|---|
| Apps | `nestar-api` (GraphQL API, port `PORT_API`) and `nestar-batch` (cron ranking server, port `PORT_BATCH`) |
| API stack | `@nestjs/graphql` + Apollo 4 (code-first, `autoSchemaFile: true`), Mongoose 8, JWT auth (`@nestjs/jwt`, bcryptjs), `graphql-upload` 13 (image uploads to `./uploads`), `ws` WebSocket chat (`WsAdapter`) |
| Batch stack | `@nestjs/schedule` with 3 daily crons (`BATCH_ROLLBACK` 01:00:00, `BATCH_TOP_PROPERTIES` 01:00:20, `BATCH_TOP_AGENTS` 01:00:40) |
| Core domain | `Property` (apartment/villa/house listing with Korean city locations), posted by `AGENT` members |
| Social features | Like, View, Follow, Comment, BoardArticle (community board), WebSocket chat |
| Roles | `MemberType`: `USER`, `AGENT`, `ADMIN` |
| DB selection | `NODE_ENV === 'production' ? MONGO_PROD : MONGO_DEV` (both apps) |

## 2. New project: ChainDepo

ChainDepo is a **blockchain-based logistics tracking platform**. Shipments move through a lifecycle of tracking events. Each event's integrity can be verified through a blockchain mechanism, which has not been chosen yet (see [DECISIONS.md](DECISIONS.md), D-07).

| Aspect | Target |
|---|---|
| Apps | `chaindepo-api` (GraphQL API) and `chaindepo-batch` (scheduled jobs) — **renamed** |
| Core domain (planned) | `Shipment` + `TrackingEvent` (replacing `Property`), plus a blockchain anchoring/ledger layer |
| Roles (planned, not decided) | e.g. `SHIPPER` / `CARRIER` / `ADMIN`, optionally `WAREHOUSE` |
| Reused infrastructure | Auth (JWT + guards), Member, Comment, Notification schema, WebSocket gateway (good fit for live tracking), batch/cron app, aggregation helpers in `libs/config.ts` |

## 3. Backend migration goal

Migrate in **small, separately verifiable layers**, so that the API keeps compiling and serving its current contract after each layer:

1. **Rename layer** (done): project/app identifiers only, with no behaviour change.
2. **Domain layer** (next): add the Shipment/TrackingEvent modules and re-target or remove Property-coupled code.
3. **Blockchain layer**: hash and anchor tracking events.
4. **Contract layer**: rename GraphQL operations and roles to logistics terminology, coordinated with the frontend.

## 4. Naming changes (completed in Phase 1)

| Kind | Old | New |
|---|---|---|
| npm package (`package.json`, `package-lock.json` root) | `nestar` | `chaindepo` |
| API app folder / nest-cli project key | `apps/nestar-api` / `nestar-api` | `apps/chaindepo-api` / `chaindepo-api` |
| Batch app folder / nest-cli project key | `apps/nestar-batch` / `nestar-batch` | `apps/chaindepo-batch` / `chaindepo-batch` |
| Batch source files | `nestar-batch.{module,controller,service}.ts` | `chaindepo-batch.{module,controller,service}.ts` |
| Batch classes | `NestarBatchModule`, `NestarBatchController`, `NestarBatchService` | `ChainDepoBatchModule`, `ChainDepoBatchController`, `ChainDepoBatchService` |
| Injected field | `nestarBatchService` | `chainDepoBatchService` |
| Build output | `dist/apps/nestar-{api,batch}` | `dist/apps/chaindepo-{api,batch}` |
| Absolute imports | `apps/nestar-api/src/...` | `apps/chaindepo-api/src/...` |
| Display strings | `Welcome to Nestar Rest API Server!` / `Welcome to Nestar BATCH Server` | `Welcome to ChainDepo Rest API Server!` / `Welcome to ChainDepo BATCH Server` |
| npm scripts | `start:dev:batch`, `start:prod`, `start:prodz:batch`, `test:e2e` paths | updated to `chaindepo-*` paths (the `start:prodz:batch` key typo is kept) |
| MongoDB database name | (in `.env`) | updated **manually by the user** in `.env`; not touched by Claude |

**Intentionally not renamed:** `Property*`, `Agent*`, `Member*`, every GraphQL operation, enums, Mongo collections, cron constants (`BATCH_TOP_PROPERTIES`, `BATCH_TOP_AGENTS`).

## 5. Module changes

### Current module graph (unchanged in Phase 1)

```
AppModule
├─ ConfigModule, GraphQLModule (Apollo), DatabaseModule, SocketModule
└─ ComponentsModule
   ├─ MemberModule, AuthModule
   ├─ PropertyModule   ← core domain to be replaced
   ├─ BoardArticleModule, LikeModule, ViewModule, CommentModule, FollowModule
ChainDepoBatchModule
└─ ConfigModule, DatabaseModule, ScheduleModule, Mongoose(Property, Member)
```

### Property coupling (must be resolved in the domain layer)

| Location | Coupling |
|---|---|
| `components/comment/comment.service.ts` + `comment.module.ts` | Imports `PropertyModule`; calls `propertyService.propertyStatsEditor({ targetKey: 'propertyComments' })` |
| `components/like/like.service.ts` → `getFavoriteProperties` | `$lookup` from `properties`, returns `Properties`, uses `OrdinaryInquiry` from `property.input.ts` |
| `components/view/view.service.ts` → `getVisitedProperties` | Same pattern for `visitedProperty` |
| `libs/config.ts` | `availablePropertySorts`, `availableOptions` (`propertyBarter`/`propertyRent`), `lookupFavorite`, `lookupVisit` |
| `schemas/Member.model.ts` | `memberProperties` counter |
| `schemas/Notification.model.ts` | `propertyId` ref `Property` |
| Enums `LikeGroup`, `ViewGroup`, `CommentGroup`, `NotificationGroup` | `PROPERTY` value |
| `chaindepo-batch` | `batchTopProperties` (rank = likes×2 + views), `batchTopAgents` (rank = properties×5 + articles×3 + likes×2 + views) |

### Planned module changes (not implemented)

| Module | Plan |
|---|---|
| `PropertyModule` | Replace with `ShipmentModule`. Keep `PropertyModule` until the frontend has migrated if parallel operation is required |
| `TrackingEventModule` (new) | Append-only events per shipment (status, location, timestamp, actor, hash) |
| `LedgerModule` / `BlockchainModule` (new) | Hashing + anchoring (approach decided by D-07) |
| `OrdinaryInquiry` | Move from `libs/dto/property/property.input.ts` to a shared `libs/dto/common` file before Property is removed (Like/View depend on it) |
| `SocketModule` | Extend from chat to tracking-event push (per-shipment subscriptions) |
| `LikeModule`, `FollowModule`, `BoardArticleModule`, `ViewModule` | Keep, re-target or drop (D-08, open) |
| Batch | Replace property/agent ranking with logistics jobs (e.g. anchoring retries, delayed-shipment detection) |

## 6. GraphQL changes

**Phase 1: none.** The generated schema is identical to the Nestar schema.

Current operations, for reference (the planned renames are in [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md)):

| Resolver | Queries / Mutations |
|---|---|
| Member | `signup`, `login`, `checkAuth`, `checkAuthRoles`, `updateMember`, `getMember`, `getAgents`, `likeTargetMember`, `getAllMembersByAdmin`, `updateMemberByAdmin`, `imageUploader`, `imagesUploader` |
| Property | `createProperty`, `getProperty`, `updateProperty`, `getProperties`, `getAgentProperties`, `getFavorites`, `getVisited`, `likeTargetProperty`, `getAllPropertiesByAdmin`, `updatePropertyByAdmin`, `removePropertyByAdmin` |
| BoardArticle | `createBoardArticle`, `getBoardArticle`, `updateBoardArticle`, `getBoardArticles`, `likeTargetBoardArticle`, `getAllBoardArticlesByAdmin`, `updateBoardArticleByAdmin`, `removeBoardArticleByAdmin` |
| Comment | `createComment`, `updateComment`, `getComments`, `removeCommentByAdmin` |
| Follow | `subscribe`, `unsubscribe`, `getMemberFollowings`, `getMemberFollowers` |

GraphQL enum types currently exposed: `MemberType`, `MemberStatus`, `MemberAuthType`, `PropertyType`, `PropertyStatus`, `PropertyLocation`, `LikeGroup`, `ViewGroup`, `CommentGroup`, `CommentStatus`, `NotificationType`, `NotificationStatus`, `NotificationGroup`, `Direction`, plus the board-article enums.

## 7. MongoDB collection / schema changes

**Phase 1: none.** All collection names and schemas are unchanged.

| Collection | Schema file | Phase 1 | Planned |
|---|---|---|---|
| `members` | `Member.model.ts` | unchanged | Change roles; replace `memberProperties` with e.g. `memberShipments`; optionally add a wallet address |
| `properties` | `Property.model.ts` | unchanged | Superseded by `shipments`; keep until data has been migrated or dropped |
| `likes`, `views`, `follows` | `Like/View/Follow.model.ts` | unchanged | Re-target `*Group.PROPERTY` → `SHIPMENT`, or drop |
| `comments` | `Comment.model.ts` | unchanged | `CommentGroup.SHIPMENT` |
| `boardArticles` | `BoardArticle.model.ts` | unchanged | Keep or drop (D-08) |
| `notifications` | `Notification.model.ts` | unchanged (no component uses it yet) | `propertyId` → `shipmentId`; add tracking notification types |
| `notices` | `Notice.model.ts` | unchanged (no component yet) | Keep |
| `shipments` (new) | — | — | Shipment aggregate |
| `trackingEvents` (new) | — | — | Append-only events + `hash`, `prevHash`, `txHash`/anchor reference |

The **database name** comes from the `MONGO_DEV`/`MONGO_PROD` URIs in `.env`, which the user has already updated.

## 8. Compatibility notes

- **GraphQL contract is 100% backward compatible** after Phase 1. The existing Nestar frontend can keep using the API without changes.
- **Ports, env var names, CORS, uploads path, and the WebSocket protocol are unchanged** (`PORT_API`, `PORT_BATCH`, `MONGO_DEV`, `MONGO_PROD`, `/uploads`, `?token=` WS auth).
- **Process/deploy scripts must use the new paths.** Anything outside the repo that starts `dist/apps/nestar-api/main` or runs `nest start nestar-batch` (PM2 ecosystem files, Docker, CI) must switch to `chaindepo-*`.
- **Git:** the rename layer is committed as `33b2d9e fix: modify project name into chaindepo` on branch `modification`.
- **Lint is broken (pre-existing):** `eslint.config.mjs` imports `typescript-eslint` (plus `@eslint/js`, `globals`), which is not declared in `package.json`. ESLint 8.57.1 is installed while the config is a v9-style flat config.
- **Batch shares the API's code:** `chaindepo-batch` imports schemas, DTOs, enums and `LoggingInterceptor` from `apps/chaindepo-api/src/...` (absolute paths through `baseUrl: "./"`). Any rename or removal in the API breaks the batch build too, so always typecheck both apps.

## 9. Domain layer, step 1: Property → Shipment (2026-10-13)

### Module graph now

```
AppModule
├─ ConfigModule, GraphQLModule (Apollo), DatabaseModule, SocketModule
└─ ComponentsModule
   ├─ MemberModule, AuthModule
   ├─ ShipmentModule   ← replaces PropertyModule
   ├─ BoardArticleModule, LikeModule, ViewModule, CommentModule (→ ShipmentModule), FollowModule
ChainDepoBatchModule
└─ ConfigModule, DatabaseModule, ScheduleModule, Mongoose(Shipment, Member)
```

### Resolved couplings (from §5)

| Coupling | Now |
|---|---|
| Comment → PropertyModule | Comment → ShipmentModule, `CommentGroup.SHIPMENT` → `shipmentStatsEditor('shipmentComments')` |
| Like `getFavoriteProperties` / View `getVisitedProperties` | `getFavoriteShipments` / `getVisitedShipments` (`$lookup` from `shipments`) |
| `OrdinaryInquiry` in `property.input.ts` | `libs/dto/common/common.input.ts` (together with `PricesRange`, `PeriodsRange`) |
| `libs/config.ts` property sorts/options/lookups | `availableShipmentSorts`, `availableCarrierSorts`, `generateTrackingCode`; `lookupFavorite`/`lookupVisit` use `favoriteShipment`/`visitedShipment` |
| `memberProperties` | `memberShipments` (counts a shipper's shipments) |
| `Notification.propertyId` | `shipmentId` (ref `Shipment`) |
| `*Group.PROPERTY` | `*Group.SHIPMENT` (Like, View, Comment, Notification) |
| Batch property/agent ranking | `batchTopShipments` (likes×2 + views), `batchTopCarriers` (delivered×5 + articles×3 + likes×2 + views); cron constants `BATCH_TOP_SHIPMENTS`, `BATCH_TOP_CARRIERS` |

### Collections

| Collection | Change |
|---|---|
| `shipments` (new) | `Shipment.model.ts`: type, status, origin, destination, address, title, desc, images, price, weight (kg), unique `shipmentTrackingCode`, `memberId`, optional `carrierId`, optional `lastEventHash`, counters, `deliveredAt`, `deletedAt` |
| `properties` | No longer used by the code; drop or archive it manually |
| `members` | `memberType` value `CARRIER` (was `AGENT`), `memberShipments` (was `memberProperties`): **manual data migration** needed |
| `likes`, `views`, `comments` | Group value `SHIPMENT` (was `PROPERTY`): **manual data migration** needed |

### GraphQL

The contract is **no longer** backward compatible with the Nestar frontend. See the rename table in [COMPLETED_TASKS.md](COMPLETED_TASKS.md) (2026-10-13 §4). New GraphQL enums: `ShipmentType`, `ShipmentStatus`, `ShipmentLocation`. Removed: `PropertyType`, `PropertyStatus`, `PropertyLocation`.

## 10. Domain layer, step 2: TrackingEvent hash chain (2026-10-14)

### Module graph now

```
ComponentsModule
├─ MemberModule, AuthModule
├─ ShipmentModule ──imports──▶ TrackingEventModule
├─ TrackingEventModule   (models: TrackingEvent + Shipment; no import of ShipmentModule)
├─ BoardArticleModule, LikeModule, ViewModule, CommentModule (→ ShipmentModule), FollowModule
```

### Collection

| Collection | Schema | Notes |
|---|---|---|
| `trackingEvents` (new) | `TrackingEvent.model.ts` | `shipmentId`, `memberId`, `eventStatus` (ShipmentStatus), `eventLocation` (ShipmentLocation), `eventNote?`, `prevHash`, `eventHash`, `eventTxHash` (null until anchored), timestamps; index `{ shipmentId: 1, createdAt: 1 }` |
| `shipments` | unchanged schema | `lastEventHash` is now always set (the tip of the chain); `shipmentStatus` and `deliveredAt` are written by chain events |

### Hash chain

- One helper: `apps/chaindepo-api/src/libs/hash-chain.ts` (`computeEventHash`, `GENESIS_HASH`). The anchoring phase should reuse it.
- Writes use Mongo **transactions** (Atlas replica set): the conditional shipment update on `{ _id, shipmentStatus, lastEventHash: prevHash }` and the event insert commit together, or neither does.

### GraphQL

New: `createTrackingEvent`, `getTrackingEvents`, `verifyShipmentChain`, `getShipmentByTrackingCode`, `claimShipment`. New types: `TrackingEvent`, `ChainVerification`, input `TrackingEventInput`. `updateShipmentByAdmin` only accepts `DELETE` as a status now. Rules and the full table: [COMPLETED_TASKS.md](COMPLETED_TASKS.md) (2026-10-14).
