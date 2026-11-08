/**
 * Enterprise CSV Sanitizer & Serializer
 * Mitigates CWE-1236 (CSV / Formula Injection) and complies strictly with RFC 4180.
 */

import { RecordErrorItem } from '../types/process';

/**
 * Regex matching formula trigger characters (=, +, -, @, \t, \r),
 * including cases where they are preceded by leading whitespace or BOM.
 */
export const FORMULA_TRIGGER_REGEX = /^[\s\uFEFF]*[=+\-@\t\r]/;

/**
 * Standard CSV headers for error records diagnostics export.
 */
export const DIAGNOSTICS_CSV_HEADERS: ReadonlyArray<string> = [
  'recordId',
  'lineNumber',
  'errorCode',
  'errorMessage',
  'schemaTuple'
];

/**
 * Sanitizes and quotes a single CSV field value:
 * 1. Converts null/undefined to empty quoted string.
 * 2. Serializes objects via JSON.stringify.
 * 3. Neutralizes formula triggers by prefixing with a single quote (').
 * 4. Escapes internal quotes by doubling them (" -> "") and wraps in quotes.
 *
 * @param value Raw field value of any type
 * @returns RFC 4180 compliant, injection-safe CSV cell string
 */
export function sanitizeCsvField(value: unknown): string {
  if (value === null || value === undefined) {
    return '""';
  }

  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);

  // Check if string begins with a formula trigger
  const isFormula = FORMULA_TRIGGER_REGEX.test(str);
  const safeStr = isFormula ? `'${str}` : str;

  // RFC 4180: Double all internal double-quotes and enclose in quotes
  return `"${safeStr.replace(/"/g, '""')}"`;
}

/**
 * Formats an array of cell values into an RFC 4180 comma-separated row.
 */
export function formatCsvRow(fields: ReadonlyArray<unknown>): string {
  return fields.map(sanitizeCsvField).join(',');
}

/**
 * Generates complete RFC 4180 CSV content with formula injection neutralization.
 * Uses standard CRLF (\r\n) line breaks.
 *
 * @param errorRecords List of error records from diagnostics
 * @returns Serialized CSV string
 */
export function generateDiagnosticsCsv(errorRecords: ReadonlyArray<RecordErrorItem>): string {
  const headerRow = DIAGNOSTICS_CSV_HEADERS.map(h => `"${h}"`).join(',');
  const dataRows = errorRecords.map(r => formatCsvRow([
    r.recordId,
    r.lineNumber,
    r.errorCode,
    r.errorMessage,
    r.schemaTuple
  ]));

  return [headerRow, ...dataRows].join('\r\n');
}

