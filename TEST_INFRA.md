# E2E Test Infra: Bulk Processing Tool 3-Tier Enterprise UI Revamp

## Test Philosophy
- Opaque-box, requirement-driven testing derived strictly from `ORIGINAL_REQUEST.md` and `PROJECT.md`.
- No dependency on private implementation internals.
- Methodology: 4-Tier Test Design (Category-Partition, Boundary Value Analysis, Pairwise Interaction, Real-World Application Scenarios).
- Progressive testability: tests verify user-facing behavior and components cleanly.

## Feature Inventory Mapping
| # | Feature | Requirement | Tier 1 (Feature) | Tier 2 (Boundary) | Tier 3 (Pairwise) | Tier 4 (Scenario) |
|---|---------|-------------|:----------------:|:-----------------:|:-----------------:|:-----------------:|
| 1 | Pre-seeded Enterprise Routes (Customer Master, Order Fulfillment, Financial Reconciliation) | R1 | >=5 | >=5 | ✓ | ✓ |
| 2 | Route Health & Status Indicators (Healthy, Degraded, Paused) | R1 | >=5 | >=5 | ✓ | ✓ |
| 3 | Active Files in Flight Metrics | R1 | >=5 | >=5 | ✓ | ✓ |
| 4 | Throughput (records/sec) & Success Rates (%) with Tabular Numerals | R1 | >=5 | >=5 | ✓ | ✓ |
| 5 | Quick Route Actions (Start, Pause, View into Workspace) | R1 | >=5 | >=5 | ✓ | ✓ |
| 6 | Visual Step Pipeline (Splitter -> Validator -> Enricher -> Report Sink) | R2 | >=5 | >=5 | ✓ | ✓ |
| 7 | Interactive Click-to-Configure Step Drawer (params, mappings, error policy, concurrency) | R2 | >=5 | >=5 | ✓ | ✓ |
| 8 | Multi-File Execution Queue with Dual Table & Card View Switcher | R2 | >=5 | >=5 | ✓ | ✓ |
| 9 | 5-Stage Progression Indicators (Ingesting -> Splitting -> In-Flight -> Sinking -> Done) | R2 | >=5 | >=5 | ✓ | ✓ |
| 10 | Record Progress Bars & Failure Counters | R2 | >=5 | >=5 | ✓ | ✓ |
| 11 | Per-File Execution Controls (Pause, Resume, Retry, Cancel, Download, Inspect Errors) | R2 | >=5 | >=5 | ✓ | ✓ |
| 12 | Process-Targeted Multi-File Ingestion Dropzone | R2 | >=5 | >=5 | ✓ | ✓ |
| 13 | File Metadata Panel (size, encoding, delimiter, row count, checksum, Loom threads) | R3 | >=5 | >=5 | ✓ | ✓ |
| 14 | Stage Timing Breakdown & Latency Waterfall Visualization | R3 | >=5 | >=5 | ✓ | ✓ |
| 15 | Batch Chunk Distribution Metrics & Partitions | R3 | >=5 | >=5 | ✓ | ✓ |
| 16 | Headroom Context Compression Toggle (-74% token reduction via structural deduplication) | R3 | >=5 | >=5 | ✓ | ✓ |
| 17 | Schema Tuple View for Structured Records | R3 | >=5 | >=5 | ✓ | ✓ |
| 18 | Raw JSON Payload Terminal / Viewer | R3 | >=5 | >=5 | ✓ | ✓ |
| 19 | CSV Export of Errors and Diagnostics | R3 | >=5 | >=5 | ✓ | ✓ |
| 20 | UI Craft: Concentric Radii Geometry ($R_{outer} = R_{inner} + padding$) & Subtle Shadows | R4 | >=5 | >=5 | ✓ | ✓ |

## Test Architecture
- Test runner: Vitest (`npm test --prefix frontend`)
- Test directories:
  - Unit/Component tests: `frontend/src/test/`
  - E2E / Integration tests: `frontend/src/test/e2e/`
- Command to run test suite: `npm test --prefix frontend`
- Verification semantics: All tests pass with exit code 0; zero failed tests.

## Real-World Application Scenarios (Tier 4)
1. **Scenario 1 - Enterprise Onboarding**: User selects Customer Master Onboarding route, reviews pipeline step parameters via drawer, uploads batch files in targeted dropzone, monitors 5-stage progression in Table view, inspects latency waterfall and verifies successful completion.
2. **Scenario 2 - Order Fulfillment Anomaly**: User inspects Order Fulfillment Stream with degraded route health, switches execution queue to Card view, pauses a stalled file, resubmits a failed batch chunk, and downloads the execution report.
3. **Scenario 3 - Financial Reconciliation & Headroom Diagnostics**: User inspects financial reconciliation error records, toggles Headroom compression to verify -74% token reduction, views schema tuples side-by-side with raw JSON, and exports the error log to CSV.
4. **Scenario 4 - Pipeline Configuration & Error Policy Tuning**: Admin user adjusts Validator error policy from quarantine to fail-fast and updates concurrency settings, verifying real-time step configuration reflection.
5. **Scenario 5 - End-to-End Bulk Ingestion Lifecycle**: Complete multi-file drag-and-drop batch upload, real-time stage progression across Loom virtual threads, and post-processing verification in both User Portal and Admin Studio.

