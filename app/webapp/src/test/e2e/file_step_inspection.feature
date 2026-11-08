@e2e @file-inspection @cucumber
Feature: File Deep Lineage, Batches, Records, and Step Summary Inspection

  As an enterprise operations engineer or data steward
  I want to click on any file in the dashboard or process workspace
  So that I can inspect its batches, records, success and failure counts,
  view the step summary breakdown, see which records are on which pipeline step,
  and identify exactly which records failed on which step.

  Background:
    Given the bulk processing tool is running with pre-seeded jobs and processes
    And a job "job-cmo-001" exists for file "customers_q4_enterprise.csv"
    And the file has 10000 total records, 5 batch chunks, and 20 validation errors

  @smoke @drawer
  Scenario: Clicking on a file opens the deep file diagnostics drawer
    Given the user is on the Live Execution Dashboard
    When the user clicks on the file name "customers_q4_enterprise.csv"
    Then the deep file diagnostics drawer should slide open
    And the drawer header should display "Deep File Diagnostics: job-cmo-001"
    And the overall records KPI strip should show 10,000 total records, 6,480 success, and 20 failures

  @batches
  Scenario: Inspecting batch chunks distribution with success and failure counts
    Given the deep file diagnostics drawer is open for "job-cmo-001"
    When the user inspects the Batch Chunk Distribution section
    Then 5 batch chunk partition cards should be displayed
    And chunk #0 should display 500 records with 499 successes and 1 failure
    And chunk #3 should display 500 records with 500 successes and 0 errors
    When the user clicks on chunk #0 partition card
    Then the card should become actively highlighted
    And the record lineage table should filter to records belonging to chunk #0
    When the user clicks "Clear Batch Filter (Show All)"
    Then all records across all chunks should be restored in the table

  @steps @step-summary
  Scenario: Viewing Step Summary breakdown across all pipeline stages
    Given the deep file diagnostics drawer is open for "job-cmo-001"
    When the user inspects the Step Summary Breakdown section
    Then summary cards for "splitter", "validator", "processor", and "sink" should be displayed
    And the "splitter" step should show 10,000 input, 10,000 success, 0 failed, and SUCCESS status
    And the "validator" step should show 10,000 input, 9,980 success, 20 failed, and WARNING status
    And the "processor" step should show 9,980 input, 9,980 success, 0 failed, and SUCCESS status
    And the "sink" step should show 9,980 input, 6,480 success, and 3,500 in-flight records

  @failures @step-failures
  Scenario: Identifying which records failed on which step
    Given the deep file diagnostics drawer is open for "job-cmo-001"
    When the user inspects the "Which Failed on Which Step" section
    Then an alert card for "Dynamic Schema Validator" should be present
    And it should display 20 failed records with error codes "INVALID_EMAIL_SYNTAX, POSTAL_CODE_MISMATCH, DUPLICATE_TAX_IDENTIFIER"
    When the user clicks "View Failures on Dynamic Schema Validator"
    Then the Record Step Lineage table should automatically filter to step "validator" and status "FAILED_AT_STEP"
    And only failed records at the validator stage should be listed

  @lineage @records-on-steps
  Scenario: Tracking which records are on which step and filtering interactively
    Given the deep file diagnostics drawer is open for "job-cmo-001"
    When the user inspects the Record Step Lineage table
    Then record "rec-101" at line 42 should show active step "Dynamic Schema Validator" with status "FAILED_AT_STEP"
    And record "rec-104" at line 1 should show active step "Audit Report Sink" with status "PASSED_STEP"
    And record "rec-107" at line 2001 should show active step "Enrichment & Transformation" with status "IN_FLIGHT"
    When the user filters the lineage step dropdown to "Audit Report Sink"
    Then only records currently at or through the sink step should be visible
    When the user filters the lineage status dropdown to "IN_FLIGHT"
    Then only in-flight records undergoing virtual thread transformation should be visible

  @resubmit @remediation
  Scenario: Resubmitting a quarantined failed record directly from the lineage view
    Given the deep file diagnostics drawer is open for "job-cmo-001"
    And the lineage table displays failed record "rec-101"
    When the user clicks the "Resubmit" button for record "rec-101"
    Then the button state should transition to "Resubmitted" and become disabled

