# Frontend Migration Plan: Nestar (Next.js) → ChainDepo

> **Status (2026-10-14):** Phase **F1** is done in `../chaindepo-next` (see [§5](#5-phase-f1-completed-2026-10-14)). The frontend now compiles and targets the Shipment/Carrier/TrackingEvent schema. §1–§4 below are the original *proposal*, written before anyone inspected the frontend. Where the two disagree, §5 is authoritative.

## 0. Preconditions

| # | Precondition | Status |
|---|---|---|
| 1 | Backend rename layer done; GraphQL contract unchanged | ✅ Done. The frontend works against `chaindepo-api` with no changes |
| 2 | Backend `Shipment`/`TrackingEvent` modules exist | ❌ Not started |
| 3 | Decisions D-07 (blockchain), D-08 (social), D-09 (roles) made | ❌ Open, see [DECISIONS.md](DECISIONS.md) |

## 1. Step-by-step plan

| Step | Work | Breaking? |
|---|---|---|
| 1 | **Branding only:** app name, `<title>`/meta, logo, favicon, footer, `package.json` name, env labels (`NEXT_PUBLIC_*` display strings). Keep all API calls | No |
| 2 | **Inventory:** list every `gql` document (`apollo/user/query.ts`, `mutation.ts`, `apollo/admin/*` or equivalent) and every TS type that mirrors backend DTOs (`Property`, `PropertiesInquiry`, …) | No |
| 3 | **Terminology layer:** move user-facing strings into one dictionary (i18n file or constants) so the UI copy can switch to logistics terms without touching data fields | No |
| 4 | **Add new data layer** once the backend has shipped the shipment operations: new `gql` documents + TS types for `Shipment`, `TrackingEvent`, ledger verification | No (additive) |
| 5 | **Build new pages** (shipment list, detail with timeline, create shipment, carrier dashboard, verify page) next to the old ones | No |
| 6 | **Switch routes/navigation** to the new pages; remove property pages | Yes, frontend only |
| 7 | **Migrate MyPage + Admin panel** tabs | Yes |
| 8 | **WebSocket:** subscribe to per-shipment tracking events (backend D-12); keep or drop the chat | Depends on backend |
| 9 | **Remove the old `gql` documents and types** after the backend drops the deprecated operations (D-11) | Yes |
| 10 | **Regression pass:** auth flow (`signup`/`login`/`checkAuth`), uploads (`imageUploader`), role-gated routes with the new role names | — |

## 2. Page / component mapping (proposed)

| Nestar page / component | Purpose today | ChainDepo page / component |
|---|---|---|
| `pages/index.tsx` (home) | Hero, top/popular properties, top agents | Dashboard: active shipments, recent tracking events, carrier stats |
| `pages/property/index.tsx` (list) + `Filter.tsx` | Property search with location/type/rooms/beds/price/square filters | `pages/shipment/index.tsx` + `ShipmentFilter.tsx`: status, origin/destination, carrier, date range, tracking no. |
| `pages/property/detail.tsx` | Property gallery, agent contact, comments, "Destination Property" | `pages/shipment/[id].tsx`: shipment summary, **TrackingTimeline**, **LedgerVerificationBadge**, carrier contact, comments |
| `PropertyCard` | Card with image, price, like ❤️ | `ShipmentCard`: tracking no., route, status chip, ETA |
| `pages/agent/index.tsx` / agent detail | Agent list (`getAgents`) and profile | `pages/carrier/index.tsx` / carrier profile |
| MyPage → My Properties (`getAgentProperties`) | Agent's own listings | MyPage → My Shipments (shipper) / Assigned Shipments (carrier) |
| MyPage → Add Property (`createProperty`) | Listing form + image upload | MyPage → Create Shipment |
| MyPage → My Favorites (`getFavorites`) | Liked properties | Watched shipments (if D-08 keeps likes), otherwise remove |
| MyPage → Recently Visited (`getVisited`) | Viewed properties | Recently viewed shipments, or remove |
| MyPage → Followers/Followings | Social graph | Remove, or "Partners" (D-08) |
| Community board (`BoardArticle`) | Forum | Announcements/Support, or remove (D-08) |
| Chat widget (WebSocket) | Global chat | Live tracking notifications (+ optional support chat) |
| Admin → Properties | `getAllPropertiesByAdmin` | Admin → Shipments |
| Admin → Members | `getAllMembersByAdmin` | Admin → Members (new roles) |
| — (new) | — | `pages/verify/[trackingNo].tsx`: public proof check (hash / tx link) |

## 3. GraphQL rename plan (proposed; the backend does not implement it yet)

| Current operation | Proposed ChainDepo operation | Notes |
|---|---|---|
| `createProperty` | `createShipment` | role SHIPPER (was AGENT) |
| `getProperty(propertyId)` | `getShipment(shipmentId)` | + `trackingEvents`, `ledgerProof` fields |
| `updateProperty` | `updateShipment` | |
| `getProperties(PropertiesInquiry)` | `getShipments(ShipmentsInquiry)` | new filter input |
| `getAgentProperties` | `getMyShipments` / `getCarrierShipments` | depends on D-09 |
| `getFavorites` | `getWatchedShipments` | only if likes kept (D-08) |
| `getVisited` | `getRecentlyViewedShipments` | only if views kept |
| `likeTargetProperty` | `watchShipment` / remove | D-08 |
| `getAllPropertiesByAdmin` | `getAllShipmentsByAdmin` | |
| `updatePropertyByAdmin` | `updateShipmentByAdmin` | |
| `removePropertyByAdmin` | `removeShipmentByAdmin` | |
| `getAgents` | `getCarriers` | |
| — (new) | `createTrackingEvent` (mutation) | role CARRIER |
| — (new) | `getTrackingEvents(shipmentId)` | timeline |
| — (new) | `verifyTrackingEvent(eventId)` / `verifyShipment(trackingNo)` | blockchain proof (D-07) |
| `signup`, `login`, `checkAuth`, `checkAuthRoles`, `updateMember`, `getMember`, `likeTargetMember`, `getAllMembersByAdmin`, `updateMemberByAdmin`, `imageUploader`, `imagesUploader` | unchanged | role enum values change (D-09) |
| `createComment`, `updateComment`, `getComments`, `removeCommentByAdmin` | unchanged | `CommentGroup.PROPERTY` → `SHIPMENT` |
| BoardArticle ops, Follow ops | unchanged or removed | D-08 |

**Type/enum renames to mirror:** `Property`→`Shipment`, `Properties`→`Shipments`, `PropertyInput`→`ShipmentInput`, `PropertyUpdate`→`ShipmentUpdate`, `PropertiesInquiry`→`ShipmentsInquiry`, `AgentPropertiesInquiry`→`MyShipmentsInquiry`, `AllPropertiesInquiry`→`AllShipmentsInquiry`, `PropertyStatus`→`ShipmentStatus`, `PropertyType`→`CargoType`, `PropertyLocation`→ a location/hub enum or free-form address, `MemberType.AGENT`→`CARRIER`.

## 4. UI terminology changes

| Nestar term | ChainDepo term |
|---|---|
| Property / Listing | Shipment |
| Agent | Carrier |
| User (buyer) | Shipper / Customer |
| Property type (Apartment/Villa/House) | Cargo type |
| Location (Seoul, Busan, …) | Origin / Destination / Hub |
| Price | Declared value / Freight cost |
| Square / Beds / Rooms | Weight / Volume / Packages |
| Active / Sold / Deleted | Created / In transit / Delivered / Cancelled (+ Exception) |
| Sold at | Delivered at |
| Constructed at | Pickup / Ship date |
| Favorites | Watched shipments |
| Recently visited | Recently viewed |
| Rank / Top properties | (remove) or On-time performance |
| Community / Board | Announcements / Support |
| Like ❤️ | Watch 👁 (if kept) |
| — | Tracking number, Tracking event, Timeline, Proof / Verified on-chain, Tx hash |

---

## 5. Phase F1 completed (2026-10-14)

Repo: `../chaindepo-next`, branch `modification`. Nothing was committed by Claude. No `.env*` was read or changed, and no packages were added. `yarn install --frozen-lockfile` was run once to restore `node_modules` from the existing lockfile. The backend was read-only, apart from this document.

**Scope:** F1 is a domain migration (Property/Agent → Shipment/Carrier) plus a minimal tracking UI. It keeps the existing MUI/SCSS look. SCSS class and file names (`property-*`, `agent-*`), and static marketing copy (`about`, `Footer`, `cs/Faq`, `cs/Notice`, `_document` meta), are **intentionally unchanged** and wait for the Tailwind redesign phase.

### 5.1 GraphQL audit result

Every field and operation the frontend uses was checked against `apps/chaindepo-api/src/libs/dto/**` and the resolvers.

| Area | Change in the frontend |
|---|---|
| Every member selection set (≈20 docs, incl. nested `memberData`/`followerData`/`followingData`), `apollo/store.ts`, `libs/auth`, JWT type, `Member` type | `memberProperties` → `memberShipments` (this was breaking login/signup at runtime) |
| Member | `getAgents(AgentsInquiry)` → `getCarriers(CarriersInquiry)`; `MemberType.AGENT` → `CARRIER` |
| Shipment ops | `getShipment(shipmentId)`, `getShipments`, `getMyShipments`, `getCarrierShipments`, `createShipment`, `updateShipment`, `likeTargetShipment(shipmentId)`, `getFavorites`/`getVisited` (shipment fields), `getAllShipmentsByAdmin`, `updateShipmentByAdmin`, `removeShipmentByAdmin(shipmentId)` |
| New ops | `getShipmentByTrackingCode(trackingCode)`, `getTrackingEvents`, `verifyShipmentChain`, `getEventAnchorStatuses`, `createTrackingEvent`, `claimShipment` |
| Fields removed | beds, rooms, barter, rent, `constructedAt`, `soldAt`; filters `roomsList`/`bedsList`/`options`/`squaresRange`/`locationList` |
| Fields mapped | location → `shipmentOrigin` + `shipmentDestination`; square → `shipmentWeight` (kg); `soldAt` → `deliveredAt`; new `shipmentTrackingCode`, `carrierId`, `lastEventHash` |
| Search inputs | `SISearch {memberId, carrierId, originList, destinationList, typeList, statusList, pricesRange (Int), weightsRange, periodsRange, text}`, `MSISearch {shipmentStatus}`, `ALSISearch {shipmentStatus, shipmentOriginList, shipmentDestinationList}` |
| Sorts | `shipmentRank/Likes/Views/Price/Weight`, `createdAt`; carriers `memberRank/Likes/Views` |
| Groups | `CommentGroup`/`LikeGroup`/`ViewGroup`/`NotificationGroup.PROPERTY` → `SHIPMENT` |
| Unchanged | board-article, comment, follow and like operations; checked field by field |

### 5.2 Role gating (behaviour change vs Nestar)

| Who | Can do in the UI |
|---|---|
| USER (shipper) | MyPage → **Create Shipment** / **My Shipments** (tabs CREATED…CANCELLED). Edit, Cancel (`updateShipment` → `CANCELLED`, written to the chain by the backend) and Delete are shown **only while `CREATED`** |
| CARRIER | MyPage → **Available Shipments** (`getShipments` with `statusList: [CREATED]`, then a client-side `!carrierId` filter → `claimShipment`) and **Assigned Shipments** (`getCarrierShipments`, inline "Add event" form → `createTrackingEvent`). The form offers only the next valid status: CREATED→PICKED_UP, PICKED_UP→IN_TRANSIT, IN_TRANSIT→IN_TRANSIT/DELIVERED |
| ADMIN | `/_admin/shipments`: status tabs for all 6 statuses, origin filter, row menu offers **only `DELETE`** (backend rule), then remove |
| Signup | Only **User (Shipper)** and **Carrier** can be chosen. The backend still accepts `ADMIN` in `MemberInput` (security gap, NEXT_STEPS P1) |

### 5.3 Page / component mapping (actual)

| Old | New |
|---|---|
| `pages/property/{index,detail}.tsx` | `pages/shipment/{index,detail}.tsx`; the detail page accepts `?id=` **or** `?code=<trackingCode>` |
| `pages/agent/{index,detail}.tsx` (`?agentId=`) | `pages/carrier/{index,detail}.tsx` (`?carrierId=`); the detail page lists the carrier's shipments by `search.carrierId` |
| `pages/_admin/properties` | `pages/_admin/shipments` |
| `components/property/{PropertyCard,Filter,Review}` | `components/shipment/{ShipmentCard,Filter,Review}` + new `TrackingTimeline` |
| `common/{PropertyBigCard,AgentCard}` | `common/{ShipmentBigCard,CarrierCard}` |
| homepage `Top/Trend/PopularProperties` (+cards), `TopAgents`(+card) | `Top/Trend/PopularShipments` (+cards), `TopCarriers` (+card) |
| mypage `AddNewProperty`, `MyProperties`, `PropertyCard` | `AddNewShipment`, `MyShipments`, `ShipmentCard`; new `CarrierShipments`, `AvailableShipments` |
| `member/MemberProperties` (category `properties`) | `member/MemberShipments` (category `shipments`, shown for USER members) |
| `admin/properties/PropertyList` | `admin/shipments/ShipmentList` |
| `types/property/*`, `enums/property.enum.ts` | `types/shipment/*`, `types/tracking-event/*`, `enums/shipment.enum.ts` (deleted the old ones). `MeLiked` moved to `types/like`, `TotalCounter` to `types/member` |

Routes were renamed with **no redirects**: `/property*` and `/agent*` now return 404.

### 5.4 Tracking UI (minimal)

`TrackingTimeline` on the shipment detail page shows:

- the events, oldest first: status, location, note, time and a short `eventHash`;
- an on-chain mark from `getEventAnchorStatuses.anchored` (✓ / ✗ / – for null);
- a Sepolia Etherscan link when `eventTxHash` is set;
- a header chip from `verifyShipmentChain`: "Chain valid · N events · M anchored", "anchoring off" when `anchoredEvents` is null, or "Chain broken at #i".

It refetches when `shipment.lastEventHash` changes.

### 5.5 Validation

| Step | `yarn tsc --noEmit` | `yarn build` |
|---|---|---|
| 0 Baseline (before changes) | ✅ | ✅ |
| 1 Additive data layer + `memberShipments` | ✅ | ✅ |
| 2 Member / Carrier | ✅ | ✅ |
| 3 Shipment switch-over, old code deleted | ✅ | ✅ |
| 4 Tracking UI | ✅ | ✅ |

The apollo documents contain no removed field or argument names (grep). Lint was not run. **Runtime smoke test: not run** (it needs the API running).

### 5.6 Pending

1. **Create `uploads/shipment/`** in this backend repo. Shipment images upload with `target: 'shipment'`, and the backend's `createWriteStream` fails if the folder is missing.
2. Runtime smoke test:
   - signup USER + CARRIER
   - USER creates a shipment with an image → 1 CREATED event, "Chain valid"
   - CARRIER claims → PICKED_UP → IN_TRANSIT (BUSAN) → DELIVERED → 4 events, anchored count rises
   - like → Favorites, open → Recently Visited, comment
   - `/shipment/detail?code=CD…`
   - admin DELETE + remove
3. Backend: an "unassigned" filter (`carrierId: null`) for `getShipments`, so Available Shipments paginates correctly.
4. Admin UI for `createTrackingEvent` (admin cancel) and `anchorPendingEvents`.
5. Redesign phase (Tailwind): rename the SCSS classes and files, update static copy and branding (`package.json` name `nestar-next`, logo, `_document` meta), mobile views.
6. Optional: remove the unused i18n keys (`Properties`, `Agents`, `Property type`, `Property Search`, `Agent Page`).
