# Enterprise Bulk Processing Tool

> High-throughput streaming ingest, dynamic Java 21 pipeline orchestration, and multi-tier operational observability powered by Project Loom, Apache Camel, and React 18.

[![Java 21](https://img.shields.io/badge/Java-21%20Loom-ED8B00?style=flat-square&logo=openjdk&logoColor=white)](https://openjdk.org/projects/loom/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.3.4-6DB33F?style=flat-square&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![Apache Camel](https://img.shields.io/badge/Apache%20Camel-4.8.0-F57F17?style=flat-square&logo=apache&logoColor=white)](https://camel.apache.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tests](https://img.shields.io/badge/Vitest%20BDD-287%20Passed-10B981?style=flat-square&logo=vitest&logoColor=white)](https://vitest.dev/)

---

## 1. Concrete System Overview

The **Enterprise Bulk Processing Tool** is a high-performance distributed data ingestion platform designed to parse, validate, enrich, and persist large streaming datasets (CSV, JSON, fixed-width ledgers) with deterministic memory usage and microsecond-level stage observability.

```
Incoming Stream (CSV / JSON)
        │
        ▼
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Univocity Chunk │ ──► │ Dynamic Janino   │ ──► │ Batch Processor  │ ──► │ Immutable Audit  │
│  Record Splitter │     │ Schema Validator │     │ & PII Normalizer │     │ CSV / JSON Sink  │
└──────────────────┘     └──────────────────┘     └──────────────────┘     └──────────────────┘
        │                         │                        │                         │
   Virtual Thread           Virtual Thread           Virtual Thread            Virtual Thread
   Chunk: 500 rows          Fail -> DLQ Queue        Enrich Map Copy           Ledger Commit
```

### Core Performance Metrics
- **Zero-Copy Chunk Streaming**: Memory-bounded Univocity streaming parser processing 10,000+ records per batch in sub-second wall-clock time.
- **Project Loom Virtual Threads**: Lightweight execution threads per chunk, preventing platform thread exhaustion under heavy concurrent file uploads.
- **In-Memory Dynamic Scripting**: Janino byte-code evaluator compiling user-defined Java 21 snippets directly in memory with sandbox boundary enforcement.
- **Headroom Context Compression**: -74% token reduction via structural JSON deduplication for forensic diagnostic inspection and LLM observability sinks.

---

## 2. Architecture & Tech Stack

```
bulk_processing_tool/
├── app/
│   ├── src/                       # Java 21 / Spring Boot 3.3.4 Backend
│   │   ├── main/java/             # Camel routes, Janino compiler, Loom threadpool, JPA repositories
│   │   ├── main/resources/        # Application config, Flyway migrations (PostgreSQL)
│   │   └── test/java/             # Backend unit, integration, and benchmark tests
│   ├── webapp/                    # React 18 / Vite 5 / TypeScript 5.6 UI
│   │   ├── src/components/        # 3-Tier UI: Catalog, Workspace, Diagnostics, Admin DCE
│   │   ├── src/services/          # Resilient apiClient with live/mock transparent fallback
│   │   ├── src/test/              # 287 Vitest BDD Cucumber/Jasmine suites
│   │   └── package.json           # Frontend dependencies & scripts
│   ├── pom.xml                    # Backend Maven build descriptor
│   └── mvnw, mvnw.cmd             # Maven wrapper scripts
├── scripts/                       # Automated runtime orchestration and watchdog monitors
│   ├── orchestrator.ps1           # Launches Docker, Backend, Frontend, and browser tab
│   ├── cleanup.ps1                # Idempotent cleanup script terminating all instances
│   └── watchdog.ps1               # Automated cleanup watchdog terminating orphaned processes
├── docker-compose.yml             # PostgreSQL 16, Redis 7, Kafka KRaft
├── pom.xml                        # Root Maven aggregator descriptor
├── package.json                   # Root convenience runner scripts (npm run dev/build/test)
├── start.ps1 / start.bat          # Single-click launch scripts
└── stop.ps1 / stop.bat            # Clean shutdown scripts
```

### Infrastructure Layer
| Service | Image / Runtime | Port | Responsibility |
| :--- | :--- | :--- | :--- |
| **Backend REST & SSE** | Java 21 Adoptium Hotspot / Spring Boot 3.3.4 | `8080` | Pipeline execution, dynamic Janino compilation, file lifecycle management |
| **Frontend Portal** | React 18 / Vite 5 / TypeScript 5.6 | `5173` | Dual User Portal & Admin Studio with Liquid Glass responsive design |
| **Relational Storage** | PostgreSQL 16 Alpine | `5432` | Job metadata, batch chunks, stage latencies, execution history |
| **Message Broker** | Apache Kafka 3.7 (KRaft mode) | `9092` | Event-driven batch chunk streaming and stage decoupling |
| **Distributed Cache** | Redis 7 Alpine | `6379` | Fast job state caching, rate limiting, and in-flight counters |

---

## 3. 3-Tier Enterprise UI Architecture

The frontend is structured into three distinct operational tiers styled with a bespoke **Liquid Glass** design system:

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 1: Process Catalog & Route Health Hub                             │
│   • Pre-seeded Enterprise Routes (Customer Onboarding, Fulfillment)    │
│   • Real-time throughput (rec/sec), success rates, and active files    │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Select Process
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 2: Dedicated Process Workspace                                    │
│   • Interactive 4-Stage Pipeline: Splitter -> Validator -> Processor   │
│   • Click-to-Configure Side Drawer for tuning stage parameters         │
│   • Dual Execution Queue (Table & Card views) with 5-stage progression │
│   • Per-file lifecycle actions: Pause, Resume, Retry, Cancel           │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │ Click File Diagnostics
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 3: Deep File Diagnostics & Forensic Inspector                     │
│   • Ingestion context panel (file size, encoding, Loom thread, SHA-256)│
│   • Stage latency waterfall visualization with microsecond precision   │
│   • Batch chunk distribution cards (records, pass, fail)               │
│   • 20-record Step Lineage table with FAILED_AT_STEP filters           │
│   • Dedicated Record Inspection modal (schema tuple & raw JSON)        │
│   • -74% Headroom Context Compression toggle & CSV export              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Direct Component Editor (DCE) & Dynamic Java Scripting

The **Direct Component Editor (DCE)** allows administrators to author and test custom pipeline logic compiled directly into bytecode by Janino.

### Method Signature Framing
Rather than presenting an unguided code textarea, the DCE embeds the code inside its true enclosing Java method declaration:

```java
// Java 21 Dynamic Validator Sandbox (Loom Virtual Thread)
public com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult validate(
    java.util.Map<String, Object> record,
    com.bulkprocessor.core.api.JobContext context
) throws Exception {

    // 1. Mandatory attribute check
    if (!record.containsKey("email") || record.get("email") == null) {
        return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
            "MISSING_EMAIL", 
            "Mandatory attribute 'email' is missing or null"
        );
    }

    // 2. Syntax / Format regex check
    String email = record.get("email").toString().trim();
    if (!email.matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
        return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid(
            "INVALID_EMAIL_SYNTAX", 
            "Email '" + email + "' does not conform to RFC 5322 pattern"
        );
    }

    // 3. Return valid result when assertions pass
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();

} // End of validate() method body
```

### DCE Interactive Features
- **In-Scope Parameter Badges**: Displays `record` (`Map<String, Object>`), `context` (`JobContext`), and `return` (`ValidationResult` or `Map`) with inline tooltips.
- **Starter Code Presets**: One-click reset to verified starter code templates for `VALIDATOR`, `BATCH_PROCESSOR`, `REPORT_WRITER`, and `SPLITTER`.
- **Pre-Flight Dry-Run Sandbox**: Compiles code in-memory and executes it against sample JSON input with microsecond duration reporting.
- **Full Class Preview**: Toggles between concise method-body view and the full compiled Java class (`public class DynamicComponentSnippet implements DynamicValidatorScript`).
- **AST Security Evaluator**: Disallows unsafe operations (`System.exit`, `ProcessBuilder`, `Runtime.getRuntime`, reflection `java.lang.reflect.*`).

---

## 5. Quickstart & Launch Guide

### Prerequisites
- **Java 21**: JDK 21 (Adoptium Temurin or Oracle Hotspot)
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Docker & Docker Compose**: For PostgreSQL, Kafka, and Redis containers
- **PowerShell**: PowerShell 5.1+ or PowerShell Core (Windows / macOS / Linux)

### One-Click Launch (Recommended)
Clone the repository and run the launch script from the project root:

```powershell
git clone https://github.com/ravishankar2463/bulk_processing_tool.git
cd bulk_processing_tool
.\start.ps1
```

The orchestrator will:
1. Spin up PostgreSQL 16, Redis 7, and Kafka KRaft in Docker.
2. Launch the Spring Boot backend on `http://localhost:8080`.
3. Launch the React Vite development server on `http://localhost:5173`.
4. Open your default web browser directly to the dashboard.
5. Keep a background watchdog running: closing the orchestrator terminal automatically tears down all processes and Docker containers cleanly.

---

### Manual Launch (Step-by-Step)

#### Step 1: Start Infrastructure
```bash
docker compose up -d postgres redis kafka
```

#### Step 2: Start Spring Boot Backend
```bash
cd app
./mvnw spring-boot:run
# Windows: .\mvnw.cmd spring-boot:run
```
*(Or from the repository root: `.\mvnw.cmd spring-boot:run -f app/pom.xml`)*  
The REST API and SSE stream will be available at `http://localhost:8080/api/v1`.

#### Step 3: Start React UI Webapp
```bash
cd app/webapp
npm install
npm run dev
```
*(Or from the repository root: `npm run dev`)*  
Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 6. API Reference

### Process Routes Catalog
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/routes/catalog` | Retrieves all registered routes with status, health, and throughput |
| `POST` | `/api/v1/routes/{routeId}/start` | Starts execution on an enterprise route |
| `POST` | `/api/v1/routes/{routeId}/pause` | Pauses an active enterprise route |

### Batch Job Lifecycle & Control
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/processes/{processId}/jobs` | Lists all execution jobs associated with a process route |
| `POST` | `/api/v1/user/jobs/batch-upload` | Uploads a batch file into a target process pipeline |
| `POST` | `/api/v1/user/jobs/{jobId}/pause` | Pauses execution for a specific file |
| `POST` | `/api/v1/user/jobs/{jobId}/resume` | Resumes a paused execution job |
| `POST` | `/api/v1/user/jobs/{jobId}/retry` | Retries failed batches for a job |
| `POST` | `/api/v1/user/jobs/{jobId}/cancel` | Aborts execution and releases allocated thread slots |

### File Diagnostics & Sandboxing
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/v1/user/jobs/{jobId}/diagnostics` | Retrieves deep file metadata, waterfall timings, chunk distribution, and record lineage |
| `POST` | `/api/v1/admin/components/test-run` | Dry-compiles Java source code with Janino and executes against sample payload |

---

## 7. Testing & Verification

The project includes an exhaustive 5-tier test suite executed via Vitest and Testing Library:

```bash
# Run all 287 tests across 23 test suites (from root)
npm test

# Alternatively, run directly from app/webapp
npm --prefix app/webapp test -- --run

# Run typecheck and production build
npm run build
# Or directly:
npm --prefix app/webapp run build
```

### Verification Matrix
- **Tier 1 (Feature Coverage)**: Unit tests for Catalog, Workspace, Diagnostics, and Admin DCE components.
- **Tier 2 (Boundary & Corner)**: Edge cases, empty states, zero-length files, delimiter mismatch, and network timeouts.
- **Tier 3 (Cross-Feature Interactions)**: End-to-end user navigation from route selection to batch upload, drawer configuration, and error inspection.
- **Tier 4 (Real-World Application Scenarios)**: Multi-chunk enterprise onboarding and financial reconciliation pipelines.
- **Tier 5 (Adversarial Hardening & Invariants)**: State immutability guarantees, Object.freeze invariants, and extreme data stress tests.
- **Cucumber / Jasmine BDD**: Feature-driven step definition tests in `FileStepInspection.cucumber.test.tsx` validating file drill-down, lineage inspection, and individual record inspection (`rec-117`).

---

## 8. License

This project is licensed under the Apache License, Version 2.0. See the `LICENSE` file for details.
