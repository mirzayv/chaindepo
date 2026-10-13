# ChainDepo Backend Agent Instructions

ChainDepo is a blockchain-based logistics tracking platform.
This NestJS GraphQL monorepo was migrated from the Nestar real-estate platform.

## Read First

- docs/BACKEND_MIGRATION.md
- docs/DECISIONS.md
- docs/NEXT_STEPS.md
- docs/COMPLETED_TASKS.md

## Structure

- apps/chaindepo-api: GraphQL API server
- apps/chaindepo-batch: cron batch server
- MongoDB with Mongoose schemas in apps/chaindepo-api/src/schemas

## Domain

- Shipment replaces Property
- TrackingEvent stores the status history of a shipment
- Roles: USER (shipper), CARRIER, ADMIN

## Rules

- Preserve the module / resolver / service / dto / schema architecture
- Make a plan before any multi-file change
- Make small incremental changes
- Never read or modify .env
- Never run git add, git commit or git push; the user commits
- Do not install packages without asking
- Ignore all_code.txt, uploads/, node_modules/ and dist/
- Update docs/COMPLETED_TASKS.md after major changes

## Validation After Each Phase

- npx tsc --noEmit -p apps/chaindepo-api/tsconfig.app.json
- npx tsc --noEmit -p apps/chaindepo-batch/tsconfig.app.json
- npx nest build chaindepo-api
- Lint is known to be broken (typescript-eslint missing); do not fix it