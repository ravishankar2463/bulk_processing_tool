# Project: Bulk Processing Tool 3-Tier Enterprise UI Revamp

## Architecture
- **Presentation Layer (`app/webapp/`)**: React 18.3.1 + Vite 5.4.8 + TypeScript 5.6.3 (strict mode) + Lucide-React.
  - Multi-tier hierarchy:
    - **Tier 1 (Catalog)**: `app/webapp/src/components/catalog/ProcessCatalog.tsx`
    - **Tier 2 (Workspace)**: `app/webapp/src/components/workspace/ProcessWorkspace.tsx`, `StepConfigDrawer.tsx`
    - **Tier 3 (Diagnostics)**: `app/webapp/src/components/diagnostics/FileDiagnosticsModal.tsx`
  - Client API layer: `app/webapp/src/services/apiClient.ts` with transparent fallback between mock fixtures (for Vitest tests & offline execution) and live Spring Boot calls.
  - Design system: `app/webapp/src/index.css` anti-slop tokens: concentric radii ($R_{outer} = R_{inner} + padding$), layered shadows, tabular numerals, spring physics transitions.
- **Backend Service Layer (`app/src/`)**: Spring Boot 3.3.4 + Java 21 + Apache Camel 4.8.0 + Project Loom virtual threads.
  - REST endpoints for process catalog, health, active files in flight, batch job execution progression, per-file lifecycle actions (pause, resume, retry, cancel), and deep file diagnostics.
- **E2E Testing Track**: Autonomous test runner and suites in `app/webapp/src/test/e2e/` covering Tier 1 (Feature Coverage), Tier 2 (Boundary & Corner), Tier 3 (Cross-Feature Combinations), and Tier 4 (Real-World Application Scenarios).

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Pre-seeded Enterprise Routes | Customer Master Onboarding, Order Fulfillment Stream, Financial Reconciliation | M2 | R1 |
| 2 | Route Status & Health Metrics | Status indicators, health calculations (Healthy / Degraded / Paused) | M2 | R1 |
| 3 | Active Files in Flight Metric | Per-route count of files currently processing | M2 | R1 |
| 4 | Aggregate Throughput & Success Rate | Throughput (records/sec) and success rate (%) with tabular numerals | M2 | R1 |
| 5 | Quick Route Actions | Route controls: Start, Pause, View into dedicated Process Workspace | M2 | R1 |
| 6 | Backend Route Catalog APIs | Backend endpoints and models for routes catalog, health, and throughput | M1 | R1, R5 |
| 7 | Dedicated Process Workspace View | Dedicated Process Workspace view in User Portal & Admin Studio | M3 | R2 |
| 8 | Visual Step Pipeline | Interactive pipeline stages: Splitter -> Validator -> Enricher/Processor -> Report Sink | M3 | R2 |
| 9 | Click-to-Configure Side Drawer | Interactive drawer for parameter tuning, field mapping, error policy, concurrency | M3 | R2 |
| 10 | Dual Table & Card Execution Queue | Multi-file execution queue toggleable between Table View and Card View | M3 | R2 |
| 11 | 5-Stage File Progression | Progression indicators: Ingesting -> Splitting -> In-Flight -> Sinking -> Done | M3 | R2 |
| 12 | Record Progress & Failure Counters | Live record progress bar, processed/total records, failure counters | M3 | R2 |
| 13 | Per-File Execution Controls | Controls: Pause, Resume, Retry, Cancel, Download Report, Inspect Errors | M3 | R2 |
| 14 | Process-Targeted Batch Dropzone | Drag-and-drop & file picker for batch file uploads directly into selected process | M3 | R2 |
| 15 | Backend Execution Queue APIs | Endpoints for batch uploads, stage transitions, and file action controls | M1 | R2, R5 |
| 16 | File Metadata Panel | Displays file size, encoding/delimiter, row count, checksum, Loom virtual thread allocation | M4 | R3 |
| 17 | Stage Timing Breakdown & Waterfall | Latency waterfall visualization across pipeline steps with microsecond precision | M4 | R3 |
| 18 | Batch Chunk Distribution Metrics | Metrics and visual indicators for chunk sizes and partition distribution | M4 | R3 |
| 19 | Headroom Context Compression Toggle | -74% token reduction via structural deduplication for repetitive records & logs | M4 | R3 |
| 20 | Schema Tuple View | Structured table view showing parsed error records with schema headers and values | M4 | R3 |
| 21 | Raw JSON Payload Terminal | Monospace syntax-highlighted viewer for raw record payload and stack traces | M4 | R3 |
| 22 | CSV Export Capability | Client-side CSV export of parsed record errors and diagnostic reports | M4 | R3 |
| 23 | Backend File Diagnostics APIs | Deep diagnostics endpoint returning metadata, timings, chunks, errors | M1 | R3, R5 |
| 24 | Concentric Radii Geometry | Enforces R_outer = R_inner + padding across cards, modals, and nested containers | M5 | R4 |
| 25 | Layered Subtle Shadows | Ambient and directional shadows (--shadow-card, --shadow-hover, --shadow-modal) | M5 | R4 |
| 26 | Balanced Tabular Typography | Tabular numerals (.tabular-nums) for stable, jitter-free metric rendering | M5 | R4 |
| 27 | Spring Physics Transitions & States | Spring transitions; complete hover, focus, active, disabled states; no AI purple | M5 | R4 |
| 28 | Strict TypeScript Types & Immutability | Robust TypeScript interfaces, zero 'any' casts, strictly immutable state updates | M1 | R4 |
| 29 | Client-Server API Resilience | apiClient supporting live Spring Boot endpoints and seamless mock fallback | M1 | R5 |
| 30 | Frontend Test Suite & Coverage | 100% green Vitest suite and >=80% coverage across new components | M6 | Quality |
| 31 | Frontend Build Verification | Zero TypeScript compilation or Vite bundling errors | M6 | Quality |
| 32 | Backend Build & Test Verification | Backend compilation and passing test suite (./mvnw test) | M1, M6 | Quality |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| E2E | E2E Testing Track | Requirement-driven test suite (Tiers 1-4), harness, and runner; publishes TEST_READY.md | none | DONE |
| M1 | Data Contracts & Backend Services | TypeScript types (`types/process.ts`), API client (`services/apiClient.ts`), backend endpoints in `backend/` for route catalog, job lifecycle, and diagnostics | none | DONE |
| M2 | Tier 1: Process / Route Catalog & Hub | `ProcessCatalog.tsx` with 3 pre-seeded routes, status indicators, active files, throughput, success rate, quick actions; integration into User Portal and Admin Studio | M1 | DONE |
| M3 | Tier 2: Dedicated Process Workspace | `ProcessWorkspace.tsx`, visual step pipeline, `StepConfigDrawer.tsx`, dual Table/Card execution queue, 5-stage progression, per-file action controls, batch dropzone | M1, M2 | DONE |
| M4 | Tier 3: Deep File Diagnostics & Headroom | `FileDiagnosticsModal.tsx`, metadata panel, latency waterfall, chunk distribution, 4-facet error inspector (Headroom -74% toggle, schema tuple, raw JSON, CSV export) | M1, M3 | DONE |
| M5 | UI Craft Polish & Workflow Integration | Concentric radii geometry, layered shadows, spring physics, seamless navigation between User Portal & Admin Studio, responsive layout polish | M2, M3, M4 | DONE |
| M6 | Final Milestone: E2E Verification & Hardening | Phase 1: Pass 100% of E2E test suite (Tiers 1-4). Phase 2: Adversarial coverage hardening (Tier 5). Clean forensic audit. | E2E, M5 | DONE |

## Interface Contracts
### `app/webapp/src/types/process.ts`
- Implemented and verified: `ProcessRoute`, `PipelineStepConfig`, `FileExecutionJob`, `FileDiagnosticsData`, `BatchChunk`, `RecordErrorItem`.

### Backend REST Contracts
- Implemented and verified: `GET /api/v1/routes/catalog`, `POST /api/v1/routes/{routeId}/start`, `POST /api/v1/routes/{routeId}/pause`, `GET /api/v1/processes/{processId}/jobs`, `POST /api/v1/user/jobs/batch-upload`, `/api/v1/user/jobs/{jobId}/pause`, `resume`, `retry`, `cancel`, `GET /api/v1/user/jobs/{jobId}/diagnostics`.

## Code Layout
- `app/webapp/src/types/process.ts`: TypeScript interfaces and types (DONE).
- `app/webapp/src/services/apiClient.ts`: Client API layer with live/mock fallback (DONE).
- `app/webapp/src/components/catalog/ProcessCatalog.tsx`: Tier 1 Process Catalog (M2).
- `app/webapp/src/components/workspace/ProcessWorkspace.tsx`: Tier 2 Process Workspace (M3).
- `app/webapp/src/components/workspace/StepConfigDrawer.tsx`: Tier 2 Side Drawer (M3).
- `app/webapp/src/components/diagnostics/FileDiagnosticsModal.tsx`: Tier 3 File Diagnostics Modal (M4).
- `app/webapp/src/utils/headroomCompressor.ts`: Headroom context compression logic (existing).
- `app/webapp/src/index.css`: Design tokens, radii, shadows, typography (M5).
- `app/webapp/src/test/`: Vitest test suites.
- `app/webapp/src/test/e2e/`: E2E test suites (Tiers 1-4) (DONE).
- `app/src/main/java/com/bulkprocessor/`: Spring Boot REST controllers, services, seeders (DONE).

