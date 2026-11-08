import { describe, it, expect } from 'vitest';
import { 
  sanitizeCsvField, 
  formatCsvRow, 
  generateDiagnosticsCsv,
  FORMULA_TRIGGER_REGEX,
  DIAGNOSTICS_CSV_HEADERS 
} from '../utils/csvSanitizer';
import { RecordErrorItem } from '../types/process';

describe('CSV Sanitizer & Formula Injection Neutralizer (CWE-1236)', () => {
  describe('Formula Trigger Characters Sanitization', () => {
    it('neutralizes leading equals sign formula trigger (=cmd|\' /C calc\'!A0)', () => {
      const payload = "=cmd|' /C calc'!A0";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'=cmd|' /C calc'!A0\"");
      expect(sanitized.startsWith("\"'=")).toBe(true);
    });

    it('neutralizes leading equals sign with leading whitespace (   =SUM(1+1))', () => {
      const payload = "   =SUM(1+1)";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'   =SUM(1+1)\"");
      expect(sanitized.startsWith("\"' ")).toBe(true);
    });

    it('neutralizes leading at sign formula trigger (@dangerous)', () => {
      const payload = "@dangerous";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'@dangerous\"");
      expect(sanitized.startsWith("\"'@")).toBe(true);
    });

    it('neutralizes leading plus sign (+1234)', () => {
      const payload = "+1234";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'+1234\"");
      expect(sanitized.startsWith("\"'+")).toBe(true);
    });

    it('neutralizes leading minus sign (-5678)', () => {
      const payload = "-5678";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'-5678\"");
      expect(sanitized.startsWith("\"'-")).toBe(true);
    });

    it('neutralizes leading tab character (\\tmalicious)', () => {
      const payload = "\tmalicious";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'\tmalicious\"");
      expect(sanitized.startsWith("\"'\t")).toBe(true);
    });

    it('neutralizes leading carriage return character (\\rmalicious)', () => {
      const payload = "\rmalicious";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'\rmalicious\"");
      expect(sanitized.startsWith("\"'\r")).toBe(true);
    });

    it('neutralizes trigger characters preceded by UTF-8 BOM or whitespace', () => {
      const payload = "\uFEFF=1+1";
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe("\"'\uFEFF=1+1\"");
    });
  });

  describe('RFC 4180 Escaping & Formatting', () => {
    it('escapes internal double quotes by doubling them (" -> "")', () => {
      const payload = 'Tax "ID" failed validation';
      const sanitized = sanitizeCsvField(payload);
      expect(sanitized).toBe('"Tax ""ID"" failed validation"');
    });

    it('handles null and undefined values safely as empty quotes', () => {
      expect(sanitizeCsvField(null)).toBe('""');
      expect(sanitizeCsvField(undefined)).toBe('""');
    });

    it('handles numeric and boolean values', () => {
      expect(sanitizeCsvField(42)).toBe('"42"');
      expect(sanitizeCsvField(0)).toBe('"0"');
      expect(sanitizeCsvField(true)).toBe('"true"');
      expect(sanitizeCsvField(false)).toBe('"false"');
    });

    it('safely serializes objects and JSON tuples', () => {
      const tuple = { key: 'value', number: 10 };
      const sanitized = sanitizeCsvField(tuple);
      expect(sanitized).toBe('"{""key"":""value"",""number"":10}"');
    });

    it('formats a full CSV row with multiple fields', () => {
      const row = formatCsvRow(['rec-001', 14, 'ERR_CODE', 'Error "quote"', { field: 'val' }]);
      expect(row).toBe('"rec-001","14","ERR_CODE","Error ""quote""","{""field"":""val""}"');
    });
  });

  describe('generateDiagnosticsCsv Integration', () => {
    const sampleErrors: RecordErrorItem[] = [
      {
        recordId: 'rec-0001',
        lineNumber: 1,
        errorCode: 'INVALID_TAX_ID',
        errorMessage: '=cmd|\' /C calc\'!A0',
        rawPayload: '{"taxId":"=cmd"}',
        schemaTuple: { taxId: '=cmd', customer: 'Acme Corp' }
      },
      {
        recordId: 'rec-0002',
        lineNumber: 2,
        errorCode: '@DANGEROUS_CODE',
        errorMessage: 'Normal error message with "quotes"',
        rawPayload: '{"normal": true}',
        schemaTuple: { field: 'normal' }
      }
    ];

    it('generates complete CSV with header, CRLF line terminators, and neutralized formula cells', () => {
      const csv = generateDiagnosticsCsv(sampleErrors);
      const lines = csv.split('\r\n');

      expect(lines).toHaveLength(3); // Header + 2 data rows
      expect(lines[0]).toBe('"recordId","lineNumber","errorCode","errorMessage","schemaTuple"');

      // Row 1: errorMessage contains =cmd... which must be prefixed with '
      expect(lines[1]).toContain("\"'=cmd|' /C calc'!A0\"");

      // Row 2: errorCode starts with @ which must be prefixed with '
      expect(lines[2]).toContain("\"'@DANGEROUS_CODE\"");
      expect(lines[2]).toContain('"Normal error message with ""quotes"""');
    });

    it('handles empty error records gracefully', () => {
      const csv = generateDiagnosticsCsv([]);
      expect(csv).toBe('"recordId","lineNumber","errorCode","errorMessage","schemaTuple"');
    });
  });
});

