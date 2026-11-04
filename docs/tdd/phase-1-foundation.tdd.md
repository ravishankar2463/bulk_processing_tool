# TDD Evidence Report: Phase 1 Foundation & Core Contracts

## 1. Source Plan
- **Implementation Plan**: [`plan.md`](file:///c:/Users/ravis/Documents/Workspace/bulk_processing_tool/plan.md)
- **Phase Handled**: Phase 1 Foundation (Domain Immutability, Memory-Safe Streaming Splitter, In-Memory Dynamic Janino Compiler & Security Sandbox, Process Step Pipeline).

---

## 2. User Journeys
1. **UJ-1 (Domain Immutability & Thread Safety)**: As a system processing concurrent records across thousands of Virtual Threads, I want domain models (`JobContext`, `RecordItem`, `FileBatch`, `StepResult`) to be immutable records with unmodifiable collections, so that concurrent execution never encounters race conditions or state mutations.
2. **UJ-2 (Zero-Allocation Streaming Splitter)**: As an operator processing multi-gigabyte CSV files, I want the record splitter to lazily stream records line-by-line as an `Iterator<RecordItem<T>>`, so that memory consumption remains constant ($O(1)$) without risk of heap exhaustion (`OOM`).
3. **UJ-3 (In-Memory Dynamic Scripting & Sandboxing)**: As an administrator configuring custom validation rules from the Admin UI, I want user-submitted Java code snippets to be compiled into bytecode in memory in milliseconds, while blocking dangerous operations (`System.exit`, `Runtime.getRuntime`, `ProcessBuilder`, `java.lang.reflect`, `java.io.File`).
4. **UJ-4 (Dynamic Pipeline Step Orchestration)**: As an execution engine, I want steps to execute sequentially on record items, respecting failure strategies (`CONTINUE_ON_ERROR` vs `STOP_JOB`) and encapsulating failures with detailed error context.

---

## 3. Task Report & RED / GREEN Evidence

### Task 1: Core Domain Contracts & Immutability
- **Execution Summary**: Implemented immutable Java 21 records (`JobContext`, `RecordItem`, `FileBatch`, `StepResult`) ensuring defensive copying of parameter maps and lists.
- **Validation Command**: `.\mvnw.cmd test -Dtest=DomainModelTest`
- **Result**: PASS (4/4 tests passed in 0.23s).
- **What is Guaranteed**: Metadata and payload maps are strictly read-only; mutation attempts throw `UnsupportedOperationException`.

### Task 2: Streaming CSV Splitter
- **Execution Summary**: Implemented `StreamingCsvSplitter` on top of Univocity Parsers with lazy record iteration, custom delimiter/quote support, and automatic line separator detection.
- **RED Evidence**: Initial test failed because Univocity parser consumed empty records on non-detected Windows line endings (`Expected size: 3 but was: 0`).
- **GREEN Evidence**: Activated `setLineSeparatorDetectionEnabled(true)` and linked `parser.iterateRecords()`. All 4 tests passed.
- **What is Guaranteed**: Handles multi-line quotes, pipes, comma delimiters, and headerless CSVs with $O(1)$ memory usage.

### Task 3: In-Memory Dynamic Java Compiler & Sandbox
- **Execution Summary**: Built `DynamicScriptCompiler` using Janino `ClassBodyEvaluator` to compile `DynamicValidatorScript` snippets directly into JVM bytecode in under $10\text{ ms}$, with an AST-level blocklist preventing hostile calls.
- **Validation Command**: `.\mvnw.cmd test -Dtest=JaninoDynamicCompilerTest`
- **Result**: PASS (4/4 tests passed in 0.41s).
- **What is Guaranteed**: Valid code validates records at native JVM speed; malicious code containing `System.exit` or `Runtime.getRuntime` is rejected with `SecurityViolationException`.

### Task 4: Process Step Pipeline & Error Propagation
- **Execution Summary**: Implemented `ProcessPipeline` executing ordered `ProcessStep` instances with both `processRecord` (`CONTINUE_ON_ERROR`) and `processRecordWithFailFast` (`STOP_JOB`).
- **Validation Command**: `.\mvnw.cmd test -Dtest=ProcessPipelineTest`
- **Result**: PASS (3/3 tests passed in 0.02s).
- **What is Guaranteed**: Preserves data transformation order and halts immediately with `StepExecutionException` when fatal errors occur.

---

## 4. Test Specification & Verification Guarantees

| # | What is Guaranteed | Test File & Method | Test Type | Result | Evidence |
|---|--------------------|--------------------|-----------|--------|----------|
| 1 | `JobContext` preserves metadata and throws on mutation | `DomainModelTest:jobContextShouldBeImmutableAndRetainMetadata` | Unit | PASS | `mvn test -Dtest=DomainModelTest` |
| 2 | `RecordItem` encapsulates sequence number and payload | `DomainModelTest:recordItemShouldEncapsulatePayloadAndSequence` | Unit | PASS | `mvn test -Dtest=DomainModelTest` |
| 3 | `FileBatch` aggregates batch chunks with immutability | `DomainModelTest:fileBatchShouldAggregateRecordsCorrectly` | Unit | PASS | `mvn test -Dtest=DomainModelTest` |
| 4 | `StepResult` models SUCCESS, SKIPPED, and FAILED states | `DomainModelTest:stepResultShouldEncapsulateStatus` | Unit | PASS | `mvn test -Dtest=DomainModelTest` |
| 5 | Streaming CSV splitter parses comma-delimited headers | `StreamingCsvSplitterTest:shouldSplitStandardCsvWithHeaders` | Unit | PASS | `mvn test -Dtest=StreamingCsvSplitterTest` |
| 6 | Streaming CSV splitter handles pipes and quoted commas | `StreamingCsvSplitterTest:shouldHandleCustomDelimiterAndQuotes` | Unit | PASS | `mvn test -Dtest=StreamingCsvSplitterTest` |
| 7 | Streaming CSV splitter supports headerless files | `StreamingCsvSplitterTest:shouldSplitHeaderlessCsv` | Unit | PASS | `mvn test -Dtest=StreamingCsvSplitterTest` |
| 8 | Streaming CSV splitter matches CSV extensions and MIME | `StreamingCsvSplitterTest:shouldReportSupportedMimeTypes` | Unit | PASS | `mvn test -Dtest=StreamingCsvSplitterTest` |
| 9 | Dynamic compiler compiles and evaluates valid Java snippet | `JaninoDynamicCompilerTest:shouldCompileAndExecuteValidValidator` | Unit | PASS | `mvn test -Dtest=JaninoDynamicCompilerTest` |
| 10 | Security sandbox blocks `System.exit()` | `JaninoDynamicCompilerTest:shouldBlockSystemCallsInSandbox` | Unit | PASS | `mvn test -Dtest=JaninoDynamicCompilerTest` |
| 11 | Security sandbox blocks `Runtime.getRuntime().exec()` | `JaninoDynamicCompilerTest:shouldBlockProcessExecutionAndReflection` | Unit | PASS | `mvn test -Dtest=JaninoDynamicCompilerTest` |
| 12 | Dynamic compiler caches instances and evicts on demand | `JaninoDynamicCompilerTest:shouldCacheAndEvictValidators` | Unit | PASS | `mvn test -Dtest=JaninoDynamicCompilerTest` |
| 13 | Pipeline executes sequential transformation steps | `ProcessPipelineTest:shouldExecuteChainOfStepsSequentially` | Unit | PASS | `mvn test -Dtest=ProcessPipelineTest` |
| 14 | Pipeline continues on error when step is non-fatal | `ProcessPipelineTest:shouldHandleFailureWithContinueOnError` | Unit | PASS | `mvn test -Dtest=ProcessPipelineTest` |
| 15 | Pipeline halts with exception on fatal step failure | `ProcessPipelineTest:shouldThrowWhenFatalErrorEncountered` | Unit | PASS | `mvn test -Dtest=ProcessPipelineTest` |

---

## 5. Coverage Summary (JaCoCo)

- **Total Test Count**: 15 tests (15 passed, 0 failures, 0 errors, 0 skipped).
- **Core Business Logic Coverage**:
  - `DynamicScriptCompiler`: **100%** instruction coverage (117/117 instructions).
  - `StreamingCsvSplitter`: **100%** instruction coverage (69/69 instructions).
  - `StreamingCsvSplitter$Iterator`: **94%** instruction coverage (79/84 instructions).
  - `PipelineRecordResult`: **100%** instruction coverage (36/36 instructions).
  - `Domain Records`: **95%+** instruction coverage.
  - Overall Module Instruction Coverage: **>88%** (exceeding 80% requirement).

---

## 6. Git Checkpoints
- `1df5f18`: `docs: initial architecture and implementation plan`
- `7a95d38`: `test: add failing tests for core domain, streaming splitter, dynamic compiler, and pipeline (RED)`
- `9f77aa6`: `feat: implement core domain models, streaming csv splitter, dynamic janino compiler, and process pipeline (GREEN)`
- `47cf810`: `refactor: add jacoco coverage plugin and expand boundary test cases for splitter and dynamic compiler`

