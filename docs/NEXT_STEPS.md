# Next Steps: Priority Order

Legend: **P0** = blocking / do first, **P1** = this sprint, **P2** = after the domain layer lands.

## A. Backend cleanup

| Priority | Task | Detail / acceptance |
|---|---|---|
| P0 | Review + commit the Shipment migration | The 2026-10-13 changes are uncommitted; the user reviews and commits them |
| P0 | Runtime smoke test + manual DB migration | Steps and Mongo commands in [COMPLETED_TASKS.md](COMPLETED_TASKS.md) (2026-10-13 §6) |
| P0 | Update external run configs | PM2 ecosystem / Docker / CI / VS Code launch configs that reference `dist/apps/nestar-*` or `nest start nestar-batch` |
| P0 | Decide D-07 | Blockchain approach (D-09 is accepted, D-08 partially, see [DECISIONS.md](DECISIONS.md)) |
| P1 | Fix ESLint | Add `typescript-eslint`, `@eslint/js`, `globals` and upgrade to `eslint@9` (matches `eslint.config.mjs`), **or** switch to `.eslintrc` for ESLint 8. Then run lint without `--fix` and review |
| P1 | Add a `typecheck` script | `"typecheck": "tsc --noEmit -p apps/chaindepo-api/tsconfig.app.json && tsc --noEmit -p apps/chaindepo-batch/tsconfig.app.json"` |
| ✅ | Decouple shared DTOs, scaffold `ShipmentModule`, re-target Comment/Like/View, role rename, remove Property | Done 2026-10-13 (in-place replacement, see [COMPLETED_TASKS.md](COMPLETED_TASKS.md)) |
| P1 | Scaffold `TrackingEventModule` | **Next phase.** Append-only `trackingEvents` with `hash` + `prevHash` (needed for every D-07 option). Update `Shipment.shipmentStatus` and `lastEventHash` on each event |
| P1 | Carrier status updates | Today only ADMIN can set `PICKED_UP`/`IN_TRANSIT`/`DELIVERED`. Let the assigned CARRIER move the status through `createTrackingEvent` |
| P1 | Carrier data on shipments | Optional `carrierData` `$lookup` (like `lookupMember`) for list/detail pages |
| P2 | Blockchain layer | Per D-07: hashing service, then (option A) an `ethers` anchoring job in `chaindepo-batch` |
| P2 | Batch jobs | Add logistics jobs (anchoring retries, delayed-shipment detection) next to the shipment/carrier ranking |
| P2 | WebSocket tracking | Per-shipment subscriptions in `socket.gateway.ts` (D-12) |

## B. Frontend migration

| Priority | Task |
|---|---|
| P0 | Open the Next.js repo and check the page/component mapping in [FRONTEND_MIGRATION.md](FRONTEND_MIGRATION.md) §2 |
| P1 | Branding-only pass (title, logo, meta, package name). No API changes |
| P1 | Inventory every `gql` document and DTO-mirroring type |
| P1 | Pull UI strings into a terminology dictionary (§4) |
| P2 | Build shipment list/detail/timeline/create pages against the new backend operations |
| P2 | Switch routes; migrate MyPage + Admin; remove property pages |
| P2 | Add a public `/verify` page for the blockchain proof |

## C. Testing

| Priority | Task |
|---|---|
| P0 | Runtime smoke test of the renamed apps: `npm run start:dev` and `npm run start:dev:batch`. Check Mongo connects to the new DB name, `/graphql` playground loads, `GET /` on batch returns "Welcome to ChainDepo BATCH Server", and WS connects |
| P1 | Fix `apps/chaindepo-api/test/jest-e2e.json` usage; add a Mongo test DB (or `mongodb-memory-server`) so `npm run test:e2e` works |
| P1 | Unit tests for `ShipmentService` and the hashing/hash-chain logic (deterministic hashes, tamper detection) |
| P2 | e2e for the GraphQL shipment flow: create → add events → verify |
| P2 | Contract test: snapshot of the generated GraphQL schema, to catch accidental breaking renames |

## D. Documentation

| Priority | Task |
|---|---|
| P1 | Replace the stock NestJS `README.md` with a ChainDepo README (apps, env vars `PORT_API`/`PORT_BATCH`/`MONGO_DEV`/`MONGO_PROD`, scripts) |
| P1 | Expand `AGENTS.md` (conventions, ignored paths, validation commands) and fill in `SKILLS.md` with repeatable workflows (e.g. "rename layer", "add module") |
| P1 | Record the outcomes of D-07/D-08/D-09 in [DECISIONS.md](DECISIONS.md) |
| P2 | Document the ledger/verification model (hash format, canonicalisation, anchor contract/address) |
| Ongoing | Update [COMPLETED_TASKS.md](COMPLETED_TASKS.md) and this file at the end of each session |
