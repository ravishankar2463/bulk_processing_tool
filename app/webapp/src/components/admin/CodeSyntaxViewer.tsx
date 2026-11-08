import React, { useState, useMemo } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';

interface CodeSyntaxViewerProps {
  code: string;
  language?: string;
  componentType?: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  canExpand?: boolean;
  maxCollapsedLines?: number;
  showLineNumbers?: boolean;
  onInspect?: () => void;
  accentColor?: string;
  fixedHeight?: boolean;
}

interface Token {
  text: string;
  type: 'keyword' | 'string' | 'comment' | 'type' | 'variable' | 'number' | 'plain';
}

const JAVA_KEYWORDS = new Set([
  'abstract', 'assert', 'boolean', 'break', 'byte', 'case', 'catch', 'char', 'class',
  'const', 'continue', 'default', 'do', 'double', 'else', 'enum', 'extends', 'final',
  'finally', 'float', 'for', 'goto', 'if', 'implements', 'import', 'instanceof', 'int',
  'interface', 'long', 'native', 'new', 'package', 'private', 'protected', 'public',
  'return', 'short', 'static', 'strictfp', 'super', 'switch', 'synchronized', 'this',
  'throw', 'throws', 'transient', 'try', 'void', 'volatile', 'while', 'true', 'false', 'null'
]);

const JAVA_KNOWN_TYPES = new Set([
  'ValidationResult', 'JobContext', 'UnivocityParser', 'AuditLogger', 'DynamicValidatorScript',
  'Map', 'HashMap', 'List', 'ArrayList', 'Set', 'HashSet', 'InputStream', 'Record', 'String',
  'Double', 'Integer', 'Long', 'Boolean', 'Object', 'Exception', 'Instant', 'UUID', 'Pattern'
]);

const JAVA_IN_SCOPE_VARS = new Set([
  'record', 'context', 'in', 'chunkSize', 'batch', 'result', 'summary', 'config'
]);

export function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = line.length;

  while (i < len) {
    const prevI = i;

    // Check for single-line comment //
    if (line[i] === '/' && i + 1 < len && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // Check for multi-line comment /* ... */
    if (line[i] === '/' && i + 1 < len && line[i + 1] === '*') {
      let comment = '/*';
      i += 2;
      while (i < len && !(line[i] === '*' && i + 1 < len && line[i + 1] === '/')) {
        comment += line[i];
        i++;
      }
      if (i < len) {
        comment += '*/';
        i += 2;
      }
      tokens.push({ text: comment, type: 'comment' });
      continue;
    }

    // Check for string literal
    if (line[i] === '"' || line[i] === "'") {
      const quote = line[i];
      let str = quote;
      i++;
      while (i < len && line[i] !== quote) {
        if (line[i] === '\\' && i + 1 < len) {
          str += line[i] + line[i + 1];
          i += 2;
        } else {
          str += line[i];
          i++;
        }
      }
      if (i < len) {
        str += quote;
        i++;
      }
      tokens.push({ text: str, type: 'string' });
      continue;
    }

    // Check for numbers
    if (/[0-9]/.test(line[i]) && (i === 0 || /[^a-zA-Z0-9_]/.test(line[i - 1]))) {
      let num = '';
      while (i < len && /[0-9.a-fA-FxX]/.test(line[i])) {
        num += line[i];
        i++;
      }
      tokens.push({ text: num, type: 'number' });
      continue;
    }

    // Check for words (identifiers / keywords / types / variables)
    if (/[a-zA-Z_]/.test(line[i])) {
      let word = '';
      while (i < len && /[a-zA-Z0-9_]/.test(line[i])) {
        word += line[i];
        i++;
      }

      if (JAVA_KEYWORDS.has(word)) {
        tokens.push({ text: word, type: 'keyword' });
      } else if (JAVA_KNOWN_TYPES.has(word)) {
        tokens.push({ text: word, type: 'type' });
      } else if (JAVA_IN_SCOPE_VARS.has(word)) {
        tokens.push({ text: word, type: 'variable' });
      } else {
        tokens.push({ text: word, type: 'plain' });
      }
      continue;
    }

    // Plain characters / symbols / spaces (including division / when not a comment)
    let plain = '';
    while (
      i < len &&
      !(line[i] === '/' && i + 1 < len && (line[i + 1] === '/' || line[i + 1] === '*')) &&
      line[i] !== '"' &&
      line[i] !== "'" &&
      !/[0-9a-zA-Z_]/.test(line[i])
    ) {
      plain += line[i];
      i++;
    }
    if (plain) {
      tokens.push({ text: plain, type: 'plain' });
    }

    // Defensive safeguard: ensure index always advances
    if (i === prevI) {
      tokens.push({ text: line[i], type: 'plain' });
      i++;
    }
  }

  return tokens;
}

const TOKEN_COLOR_MAP: Record<Token['type'], string> = {
  keyword: '#38bdf8',      // Vivid Sky Blue
  type: '#f472b6',         // Pink / Violet
  variable: '#c084fc',     // Light Purple
  string: '#34d399',       // Mint Emerald
  comment: '#64748b',      // Muted Slate Italic
  number: '#fbbf24',       // Amber
  plain: '#e2e8f0'         // Clean White/Silver
};

export const CodeSyntaxViewer: React.FC<CodeSyntaxViewerProps> = ({
  code,
  language = 'Java 21',
  isExpanded = false,
  onToggleExpand,
  canExpand = true,
  maxCollapsedLines = 5,
  showLineNumbers = true,
  onInspect,
  accentColor = '#3b82f6',
  fixedHeight = false
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const lines = useMemo(() => {
    return (code || '').split('\n');
  }, [code]);

  const totalLines = lines.length;
  const isClipped = !isExpanded && totalLines > maxCollapsedLines;
  const displayedLines = isClipped ? lines.slice(0, maxCollapsedLines) : lines;

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      borderRadius: '10px',
      overflow: 'hidden',
      border: '1px solid #1e293b',
      background: '#090d16',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.25)',
      fontFamily: 'var(--font-mono, monospace)',
      fontSize: '12px',
      position: 'relative'
    }}>
      {/* Code Viewer Mini-Toolbar - Fixed Height & Non-Wrapping */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 10px',
        height: '36px',
        minHeight: '36px',
        background: '#0f172a',
        borderBottom: '1px solid #1e293b',
        color: '#94a3b8',
        boxSizing: 'border-box'
      }}>
        {/* Left: Window Dots & Language */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center', flexShrink: 0 }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', display: 'inline-block' }} />
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }} />
          </div>
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 600, 
            color: '#cbd5e1', 
            padding: '1px 6px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}>
            {language}
          </span>
          <span style={{ fontSize: '11px', color: '#64748b', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {totalLines} {totalLines === 1 ? 'line' : 'lines'}
          </span>
        </div>

        {/* Right: Actions (Expand/Collapse, Copy, Inspect) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
          {canExpand && totalLines > maxCollapsedLines && onToggleExpand && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onToggleExpand();
              }}
              title={isExpanded ? 'Collapse preview' : `Expand full script (${totalLines} lines)`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '3px',
                padding: '2px 7px',
                fontSize: '11px',
                fontWeight: 500,
                color: isExpanded ? accentColor : '#94a3b8',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              {isExpanded ? (
                <>
                  <ChevronUp size={12} />
                  <span>Collapse</span>
                </>
              ) : (
                <>
                  <ChevronDown size={12} />
                  <span>+{totalLines - maxCollapsedLines}</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={handleCopy}
            title="Copy source code to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '2px 7px',
              fontSize: '11px',
              fontWeight: 500,
              color: copied ? '#34d399' : '#94a3b8',
              background: copied ? 'rgba(52, 211, 153, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${copied ? 'rgba(52, 211, 153, 0.3)' : 'rgba(255, 255, 255, 0.1)'}`,
              borderRadius: '4px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}
          >
            {copied ? (
              <>
                <Check size={11} color="#34d399" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy size={11} />
                <span>Copy</span>
              </>
            )}
          </button>

          {onInspect && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onInspect();
              }}
              title="Inspect full source code, parameters, and compiled class"
              aria-label="Inspect code"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '3px 6px',
                fontSize: '11px',
                fontWeight: 500,
                color: '#38bdf8',
                background: 'rgba(56, 189, 248, 0.1)',
                border: '1px solid rgba(56, 189, 248, 0.25)',
                borderRadius: '4px',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}
            >
              <Maximize2 size={12} />
            </button>
          )}
        </div>
      </div>

      {/* Code Editor Body - Uniform Height in Card View */}
      <div style={{
        position: 'relative',
        height: isExpanded ? 'auto' : (fixedHeight ? '138px' : 'none'),
        minHeight: fixedHeight ? '138px' : 'none',
        maxHeight: isExpanded ? '460px' : 'none',
        overflowY: isExpanded ? 'auto' : 'hidden',
        overflowX: 'auto',
        padding: '8px 0',
        background: '#090d16',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'table', width: '100%', minWidth: '100%' }}>
          {displayedLines.map((rawLine, idx) => {
            const lineTokens = tokenizeLine(rawLine);
            return (
              <div 
                key={idx} 
                style={{ 
                  display: 'table-row',
                  lineHeight: '1.6',
                  fontSize: '11.5px'
                }}
              >
                {showLineNumbers && (
                  <span style={{
                    display: 'table-cell',
                    width: '38px',
                    paddingRight: '10px',
                    textAlign: 'right',
                    color: '#475569',
                    userSelect: 'none',
                    borderRight: '1px solid rgba(255, 255, 255, 0.07)',
                    verticalAlign: 'top',
                    fontSize: '10.5px',
                    whiteSpace: 'nowrap'
                  }}>
                    {idx + 1}
                  </span>
                )}
                <span style={{
                  display: 'table-cell',
                  paddingLeft: '12px',
                  paddingRight: '12px',
                  whiteSpace: 'pre',
                  verticalAlign: 'top'
                }}>
                  {lineTokens.length === 0 ? (
                    ' '
                  ) : (
                    lineTokens.map((t, tIdx) => (
                      <span
                        key={tIdx}
                        style={{
                          color: TOKEN_COLOR_MAP[t.type],
                          fontStyle: t.type === 'comment' ? 'italic' : 'normal',
                          fontWeight: t.type === 'keyword' || t.type === 'type' ? 600 : 400
                        }}
                      >
                        {t.text}
                      </span>
                    ))
                  )}
                </span>
              </div>
            );
          })}
        </div>

        {/* Elegant Gradient Fade Out when collapsed with More Lines */}
        {isClipped && (
          <div 
            onClick={onToggleExpand}
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: '38px',
              background: 'linear-gradient(to bottom, rgba(9, 13, 22, 0.05) 0%, rgba(9, 13, 22, 0.95) 100%)',
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'center',
              paddingBottom: '4px',
              cursor: 'pointer'
            }}
          >
            <span style={{
              fontSize: '10.5px',
              color: '#94a3b8',
              fontWeight: 500,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              background: 'rgba(15, 23, 42, 0.9)',
              padding: '2px 8px',
              borderRadius: '999px',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              whiteSpace: 'nowrap'
            }}>
              <ChevronDown size={11} />
              Show full script (+{totalLines - maxCollapsedLines} lines)
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
