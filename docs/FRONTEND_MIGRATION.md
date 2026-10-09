# Frontend Migration Plan: Nestar (Next.js) → ChainDepo

> **Caveat:** The Next.js frontend is **not in this repository** and was not inspected in this session. The page/component names below come from references in the backend source comments (`index.tsx`, `detail.tsx`, `Filter.tsx`, `PropertyCard`, MyPage tabs, admin panel, chat) and from the GraphQL operations. Before you implement anything, check each row against the real frontend tree.

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
