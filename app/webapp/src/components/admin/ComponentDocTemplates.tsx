import React, { useState } from 'react';
import { 
  BookOpen, 
  Code2, 
  Copy, 
  Check, 
  HelpCircle, 
  Sparkles, 
  FileCode, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp,
  PlusCircle,
  ExternalLink
} from 'lucide-react';
import { 
  ComponentTemplate, 
  COMPONENT_TEMPLATES, 
  SCRIPT_API_DOCS, 
  getTemplatesForType 
} from '../../utils/componentTemplates';

export interface ComponentDocTemplatesProps {
  componentType: string;
  onSelectTemplate: (template: ComponentTemplate) => void;
  onInsertSnippet?: (snippet: string) => void;
}

export const ComponentDocTemplates: React.FC<ComponentDocTemplatesProps> = ({
  componentType,
  onSelectTemplate,
  onInsertSnippet
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [isDocsOpen, setIsDocsOpen] = useState<boolean>(false);
  const [activeDocTab, setActiveDocTab] = useState<'VARIABLES' | 'CONTRACTS' | 'SNIPPETS' | 'SECURITY'>('VARIABLES');
  const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null);

  const availableTemplates = getTemplatesForType(componentType);

  const handleApplyTemplate = (templateId: string) => {
    setSelectedTemplateId(templateId);
    const found = COMPONENT_TEMPLATES.find(t => t.id === templateId);
    if (found) {
      onSelectTemplate(found);
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(id);
    setTimeout(() => setCopiedSnippet(null), 2000);
  };

  const QUICK_SNIPPETS = [
    {
      id: 'snip-valid',
      label: 'Valid Result',
      code: 'return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.valid();'
    },
    {
      id: 'snip-invalid',
      label: 'Invalid Result',
      code: 'return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("ERROR_CODE", "Validation error description");'
    },
    {
      id: 'snip-null-check',
      label: 'Null / Missing Check',
      code: `if (!record.containsKey("field") || record.get("field") == null) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("MISSING_FIELD", "Field is mandatory");
}`
    },
    {
      id: 'snip-regex',
      label: 'Regex Pattern Match',
      code: `String value = record.getOrDefault("field", "").toString();
if (!value.matches("^[A-Za-z0-9]+$")) {
    return com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult.invalid("INVALID_SYNTAX", "Alphanumeric pattern violated");
}`
    },
    {
      id: 'snip-hashmap-enrich',
      label: 'HashMap Copy & Enrich',
      code: `java.util.Map result = new java.util.HashMap(record);
result.put("processedAt", java.time.Instant.now().toString());
return result;`
    }
  ];

  return (
    <div data-testid="component-doc-templates-container" style={{ marginBottom: '16px' }}>
      {/* Top Action Bar: Template Picker & API Docs Toggle */}
      <div 
        className="liquid-glass-card"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: 'var(--bg-card-subtle, #f8fafc)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle, #e2e8f0)',
          flexWrap: 'wrap',
          gap: '10px'
        }}
      >
        {/* Template Selector Dropdown */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, minWidth: '280px' }}>
          <Sparkles size={16} color="var(--primary, #2563eb)" />
          <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
            Starter Templates:
          </span>
          <select
            data-testid="template-selector-dropdown"
            value={selectedTemplateId}
            onChange={(e) => handleApplyTemplate(e.target.value)}
            style={{
              padding: '6px 10px',
              borderRadius: '6px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #0f172a)',
              fontSize: '12px',
              fontWeight: 500,
              flex: 1,
              maxWidth: '320px',
              cursor: 'pointer'
            }}
          >
            <option value="">-- Select a pre-built template --</option>
            {availableTemplates.map((tpl) => (
              <option key={tpl.id} value={tpl.id}>
                {tpl.name}
              </option>
            ))}
          </select>
        </div>

        {/* Toggle API Documentation Button */}
        <button
          type="button"
          data-testid="toggle-api-docs-btn"
          onClick={() => setIsDocsOpen(!isDocsOpen)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            background: isDocsOpen ? 'var(--primary-light, #eff6ff)' : 'var(--bg-card, #ffffff)',
            border: `1px solid ${isDocsOpen ? 'var(--primary, #2563eb)' : 'var(--border-subtle, #cbd5e1)'}`,
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 600,
            color: isDocsOpen ? 'var(--primary, #2563eb)' : 'var(--text-main, #334155)',
            cursor: 'pointer',
            boxShadow: 'var(--shadow-sm, 0 1px 2px rgba(0,0,0,0.04))'
          }}
        >
          <BookOpen size={14} />
          <span>API Docs & Class Contracts</span>
          {isDocsOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Quick Snippet Chips Bar */}
      <div 
        data-testid="quick-snippets-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '8px',
          overflowX: 'auto',
          paddingBottom: '2px'
        }}
      >
        <span style={{ fontSize: '11px', color: 'var(--text-muted, #64748b)', fontWeight: 600, whiteSpace: 'nowrap' }}>
          Quick Insert:
        </span>
        {QUICK_SNIPPETS.map((snip) => (
          <button
            key={snip.id}
            type="button"
            data-testid={`quick-snippet-${snip.id}`}
            onClick={() => {
              if (onInsertSnippet) {
                onInsertSnippet(snip.code);
              } else {
                handleCopy(snip.code, snip.id);
              }
            }}
            title={snip.code}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '3px 8px',
              borderRadius: '4px',
              border: '1px solid var(--border-subtle, #cbd5e1)',
              background: 'var(--bg-card, #ffffff)',
              color: 'var(--text-main, #334155)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease'
            }}
          >
            <PlusCircle size={11} color="var(--primary, #2563eb)" />
            <span>{snip.label}</span>
          </button>
        ))}
      </div>

      {/* Expanded API Reference & Documentation Panel */}
      {isDocsOpen && (
        <div 
          data-testid="component-api-docs-drawer"
          className="liquid-glass-card"
          style={{
            marginTop: '12px',
            padding: '16px',
            background: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            border: '1px solid var(--border-subtle, #cbd5e1)',
            boxShadow: 'var(--shadow-card, 0 2px 8px rgba(15,23,42,0.06))',
            animation: 'fadeIn 0.2s ease-in-out'
          }}
        >
          {/* Docs Subtabs */}
          <div style={{ display: 'flex', gap: '6px', borderBottom: '1px solid var(--border-subtle, #e2e8f0)', paddingBottom: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
            <button
              type="button"
              data-testid="doc-tab-variables"
              onClick={() => setActiveDocTab('VARIABLES')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeDocTab === 'VARIABLES' ? 'var(--primary, #2563eb)' : 'transparent',
                color: activeDocTab === 'VARIABLES' ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              In-Scope Variables
            </button>
            <button
              type="button"
              data-testid="doc-tab-contracts"
              onClick={() => setActiveDocTab('CONTRACTS')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeDocTab === 'CONTRACTS' ? 'var(--primary, #2563eb)' : 'transparent',
                color: activeDocTab === 'CONTRACTS' ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Class Contracts & Return Types
            </button>
            <button
              type="button"
              data-testid="doc-tab-snippets"
              onClick={() => setActiveDocTab('SNIPPETS')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeDocTab === 'SNIPPETS' ? 'var(--primary, #2563eb)' : 'transparent',
                color: activeDocTab === 'SNIPPETS' ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Code Library & Examples
            </button>
            <button
              type="button"
              data-testid="doc-tab-security"
              onClick={() => setActiveDocTab('SECURITY')}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: 'none',
                background: activeDocTab === 'SECURITY' ? 'var(--primary, #2563eb)' : 'transparent',
                color: activeDocTab === 'SECURITY' ? '#ffffff' : 'var(--text-muted, #64748b)',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer'
              }}
            >
              Security Sandbox Rules
            </button>
          </div>

          {/* Subtab 1: In-Scope Variables */}
          {activeDocTab === 'VARIABLES' && (
            <div data-testid="doc-content-variables" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Janino Virtual Thread Execution Scope
              </h4>
              <p style={{ margin: '0 0 10px', color: 'var(--text-muted, #64748b)' }}>
                Your script snippet is compiled in-memory as the method body of a Java 21 class implementing <code style={{ fontFamily: 'var(--font-mono)' }}>DynamicValidatorScript</code>:
              </p>
              <pre style={{ margin: '0 0 12px', padding: '10px 12px', background: '#090d16', color: '#94a3b8', borderRadius: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
{`public com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult validate(
    java.util.Map record, 
    com.bulkprocessor.core.api.JobContext context
) {
    // YOUR CUSTOM CODE EXECUTES HERE
}`}
              </pre>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ background: 'var(--bg-card-subtle, #f8fafc)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary, #2563eb)', marginBottom: '4px' }}>
                    record (java.util.Map)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    Contains all row column attributes as key-value pairs parsed from the CSV/JSON stream.
                    <br />
                    • <code style={{ fontFamily: 'var(--font-mono)' }}>record.get("email")</code>
                    <br />
                    • <code style={{ fontFamily: 'var(--font-mono)' }}>record.containsKey("id")</code>
                  </div>
                </div>
                <div style={{ background: 'var(--bg-card-subtle, #f8fafc)', padding: '10px', borderRadius: '6px', border: '1px solid var(--border-subtle, #e2e8f0)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--primary, #2563eb)', marginBottom: '4px' }}>
                    context (JobContext)
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>
                    Metadata about the active job and Loom thread allocation.
                    <br />
                    • <code style={{ fontFamily: 'var(--font-mono)' }}>context.jobId()</code>
                    <br />
                    • <code style={{ fontFamily: 'var(--font-mono)' }}>context.processId()</code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 2: Class Contracts */}
          {activeDocTab === 'CONTRACTS' && (
            <div data-testid="doc-content-contracts" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                ValidationResult Class Contract
              </h4>
              <p style={{ margin: '0 0 10px', color: 'var(--text-muted, #64748b)' }}>
                The class <code style={{ fontFamily: 'var(--font-mono)' }}>com.bulkprocessor.core.dynamic.DynamicValidatorScript.ValidationResult</code> provides two factory methods:
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ padding: '8px 12px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, color: '#065f46' }}>
                    1. ValidationResult.valid()
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857' }}>
                    Indicates the record passed all schema assertions. It progresses immediately to the next pipeline stage.
                  </div>
                </div>
                <div style={{ padding: '8px 12px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '6px' }}>
                  <div style={{ fontWeight: 700, color: '#991b1b' }}>
                    2. ValidationResult.invalid(String errorCode, String errorMessage)
                  </div>
                  <div style={{ fontSize: '12px', color: '#b91c1c' }}>
                    Halts pipeline progression for this record, routes it to the Dead Letter Queue (DLQ), and logs the structured error code into the File Diagnostics report.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab 3: Code Examples */}
          {activeDocTab === 'SNIPPETS' && (
            <div data-testid="doc-content-snippets" style={{ fontSize: '13px' }}>
              <h4 style={{ margin: '0 0 8px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Standard Available Templates for {componentType}
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '200px', overflowY: 'auto' }}>
                {availableTemplates.map((tpl) => (
                  <div 
                    key={tpl.id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--bg-card-subtle, #f8fafc)',
                      borderRadius: '6px',
                      border: '1px solid var(--border-subtle, #e2e8f0)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px', color: 'var(--text-main, #0f172a)' }}>{tpl.name}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted, #64748b)' }}>{tpl.description}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleApplyTemplate(tpl.id)}
                      style={{
                        padding: '4px 12px',
                        background: 'var(--primary, #2563eb)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      Use Template
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 4: Security Rules */}
          {activeDocTab === 'SECURITY' && (
            <div data-testid="doc-content-security" style={{ fontSize: '13px', lineHeight: 1.5 }}>
              <h4 style={{ margin: '0 0 6px', fontSize: '14px', fontWeight: 700, color: 'var(--text-main, #0f172a)' }}>
                Security Sandbox & Loom Virtual Thread Constraints
              </h4>
              <p style={{ margin: '0 0 10px', color: 'var(--text-muted, #64748b)' }}>
                Janino enforces an AST-level security evaluator before byte-code generation to ensure enterprise worker nodes remain safe:
              </p>
              <ul style={{ margin: 0, paddingLeft: '20px', color: '#991b1b', fontSize: '12px' }}>
                <li><strong>System Calls</strong>: <code style={{ fontFamily: 'var(--font-mono)' }}>System.exit()</code>, <code style={{ fontFamily: 'var(--font-mono)' }}>System.gc()</code> are strictly prohibited.</li>
                <li><strong>Process Execution</strong>: <code style={{ fontFamily: 'var(--font-mono)' }}>ProcessBuilder</code> and <code style={{ fontFamily: 'var(--font-mono)' }}>Runtime.getRuntime()</code> trigger a SecurityViolationException.</li>
                <li><strong>Reflection</strong>: <code style={{ fontFamily: 'var(--font-mono)' }}>java.lang.reflect.*</code> is blocked to prevent sandbox escapes.</li>
                <li><strong>File System</strong>: Raw file access outside of dedicated sink streaming channels is blocked.</li>
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ComponentDocTemplates;

