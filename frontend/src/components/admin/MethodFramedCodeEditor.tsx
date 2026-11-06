import React, { useState } from 'react';
import { 
  Code2, 
  Copy, 
  Check, 
  RotateCcw, 
  Eye, 
  Terminal, 
  Sparkles, 
  Info, 
  CheckCircle2 
} from 'lucide-react';
import { 
  getMethodSignatureForType, 
  getDefaultStarterCode, 
  generateFullClassPreview, 
  sanitizeMethodBody 
} from '../../utils/componentTemplates';

export interface MethodFramedCodeEditorProps {
  id: string;
  label: string;
  componentType: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  modeLabel?: string;
}

export const MethodFramedCodeEditor: React.FC<MethodFramedCodeEditorProps> = ({
  id,
  label,
  componentType,
  value,
  onChange,
  rows = 10,
  modeLabel = 'Execution Mode: CODE_SNIPPET'
}) => {
  const [showClassPreview, setShowClassPreview] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [activeParamTooltip, setActiveParamTooltip] = useState<string | null>(null);

  const sig = getMethodSignatureForType(componentType);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleResetStarter = () => {
    const starter = getDefaultStarterCode(componentType);
    onChange(starter);
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    const sanitized = sanitizeMethodBody(raw);
    onChange(sanitized);
  };

  const fullClassPreview = generateFullClassPreview(componentType, value);
  const lineCount = value.split('\n').length;
  const charCount = value.length;

  return (
    <div 
      data-testid="method-framed-code-editor"
      style={{
        borderRadius: '10px',
        border: '1px solid #1e293b',
        background: '#090d16',
        color: '#f8fafc',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        overflow: 'hidden',
        marginBottom: '16px'
      }}
    >
      {/* Top Meta Bar: Labels, Execution Mode, and Controls */}
      <div 
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '10px 14px',
          background: '#0f172a',
          borderBottom: '1px solid #1e293b',
          flexWrap: 'wrap',
          gap: '8px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Code2 size={16} color="#38bdf8" />
          <label 
            htmlFor={id} 
            style={{ 
              fontSize: '13px', 
              fontWeight: 700, 
              color: '#f8fafc', 
              cursor: 'pointer' 
            }}
          >
            {label}
          </label>
          <span 
            style={{
              padding: '2px 8px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.12)',
              color: '#38bdf8',
              fontSize: '11px',
              fontWeight: 600,
              border: '1px solid rgba(56, 189, 248, 0.3)'
            }}
          >
            Java 21 · Loom Virtual Thread
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '11px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
            {modeLabel}
          </span>

          <button
            type="button"
            data-testid="reset-starter-code-btn"
            onClick={handleResetStarter}
            title="Reset editor with guided starter code template"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: '#cbd5e1',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <RotateCcw size={11} />
            <span>Starter Code</span>
          </button>

          <button
            type="button"
            data-testid="toggle-class-preview-btn"
            onClick={() => setShowClassPreview(!showClassPreview)}
            title="View complete compiled Java class representation"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: showClassPreview ? '#38bdf8' : '#1e293b',
              color: showClassPreview ? '#090d16' : '#cbd5e1',
              fontSize: '11px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            <Eye size={11} />
            <span>{showClassPreview ? 'Method Body' : 'Full Class Preview'}</span>
          </button>

          <button
            type="button"
            data-testid="copy-code-btn"
            onClick={() => handleCopy(showClassPreview ? fullClassPreview : value)}
            title="Copy code to clipboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid #334155',
              background: '#1e293b',
              color: copied ? '#34d399' : '#cbd5e1',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer'
            }}
          >
            {copied ? <Check size={11} color="#34d399" /> : <Copy size={11} />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {/* Method Enclosure Header Chrome */}
      <div 
        data-testid="method-signature-header-chrome"
        style={{
          padding: '10px 14px 6px',
          background: '#0c1322',
          borderBottom: '1px solid #1e293b',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px'
        }}
      >
        <div style={{ color: '#64748b', fontSize: '11px', marginBottom: '4px' }}>
          {sig.commentHeader}
        </div>
        
        {/* Method Declaration Line */}
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', lineHeight: 1.6 }}>
          <span style={{ color: '#f43f5e', fontWeight: 600 }}>public</span>
          <span style={{ color: '#a855f7', fontWeight: 600 }}>{sig.shortReturnType}</span>
          <span style={{ color: '#38bdf8', fontWeight: 700 }}>{sig.methodName}</span>
          <span style={{ color: '#94a3b8' }}>(</span>
          {sig.parameters.map((param, idx) => (
            <React.Fragment key={param.name}>
              <span 
                style={{ 
                  color: '#2dd4bf', 
                  cursor: 'help',
                  borderBottom: '1px dotted #2dd4bf'
                }}
                title={param.description}
                onMouseEnter={() => setActiveParamTooltip(param.name)}
                onMouseLeave={() => setActiveParamTooltip(null)}
              >
                {param.type}
              </span>
              <span 
                style={{ 
                  color: '#fde047', 
                  fontWeight: 600,
                  cursor: 'help'
                }}
                title={param.description}
                onMouseEnter={() => setActiveParamTooltip(param.name)}
                onMouseLeave={() => setActiveParamTooltip(null)}
              >
                {param.name}
              </span>
              {idx < sig.parameters.length - 1 && <span style={{ color: '#94a3b8' }}>,&nbsp;</span>}
            </React.Fragment>
          ))}
          <span style={{ color: '#94a3b8' }}>)</span>
          <span style={{ color: '#f43f5e', fontWeight: 600 }}>throws</span>
          <span style={{ color: '#a855f7' }}>Exception</span>
          <span style={{ color: '#f8fafc', fontWeight: 700 }}>&#123;</span>
        </div>

        {/* In-Scope Parameter Guide Chips */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginTop: '8px',
            paddingTop: '6px',
            borderTop: '1px dashed #1e293b',
            fontSize: '11px',
            flexWrap: 'wrap'
          }}
        >
          <span style={{ color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
            <Info size={11} /> In-Scope:
          </span>
          {sig.parameters.map((p) => (
            <span
              key={p.name}
              style={{
                padding: '2px 6px',
                borderRadius: '4px',
                background: '#1e293b',
                color: '#e2e8f0',
                border: '1px solid #334155'
              }}
              title={p.description}
            >
              <strong style={{ color: '#fde047' }}>{p.name}</strong>:&nbsp;
              <span style={{ color: '#94a3b8' }}>{p.type.split('<')[0]}</span>
            </span>
          ))}
          <span
            style={{
              padding: '2px 6px',
              borderRadius: '4px',
              background: '#1e293b',
              color: '#a855f7',
              border: '1px solid #334155'
            }}
            title={`Must return an instance of ${sig.returnType}`}
          >
            <strong>return</strong>: {sig.shortReturnType}
          </span>
        </div>
      </div>

      {/* Code Editor Surface OR Full Class Preview */}
      {showClassPreview ? (
        <div 
          data-testid="full-class-preview-surface"
          style={{
            padding: '14px',
            background: '#090d16',
            maxHeight: '340px',
            overflowY: 'auto'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', color: '#38bdf8', fontSize: '11px' }}>
            <span>Complete Compiled Java Class (Cooked by Janino ClassBodyEvaluator)</span>
            <span style={{ color: '#94a3b8' }}>Read-only preview</span>
          </div>
          <pre 
            style={{
              margin: 0,
              fontFamily: 'var(--font-mono)',
              fontSize: '12px',
              lineHeight: 1.5,
              color: '#94a3b8'
            }}
          >
            {fullClassPreview}
          </pre>
        </div>
      ) : (
        <div style={{ position: 'relative', display: 'flex' }}>
          {/* Visual Indent Guide Margin */}
          <div 
            style={{
              width: '32px',
              background: '#0c1322',
              borderRight: '1px solid #1e293b',
              userSelect: 'none',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              paddingTop: '12px',
              color: '#334155',
              fontFamily: 'var(--font-mono)',
              fontSize: '11px'
            }}
          >
            <div style={{ width: '2px', height: '100%', background: 'rgba(56, 189, 248, 0.15)' }} />
          </div>

          <textarea
            id={id}
            value={value}
            onChange={handleChange}
            rows={rows}
            style={{
              flex: 1,
              fontFamily: 'var(--font-mono)',
              fontSize: '13px',
              padding: '12px 14px',
              border: 'none',
              background: '#090d16',
              color: '#f8fafc',
              outline: 'none',
              lineHeight: 1.55,
              resize: 'vertical'
            }}
            placeholder="// Enter custom Java method body logic here..."
            spellCheck={false}
          />
        </div>
      )}

      {/* Method Enclosure Footer Chrome */}
      <div 
        data-testid="method-signature-footer-chrome"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '8px 14px',
          background: '#0c1322',
          borderTop: '1px solid #1e293b',
          fontFamily: 'var(--font-mono)',
          fontSize: '12px',
          color: '#94a3b8'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#f8fafc', fontWeight: 700 }}>&#125;</span>
          <span style={{ color: '#64748b', fontSize: '11px' }}>
            // End of {sig.methodName}() method body
          </span>
        </div>

        <div style={{ fontSize: '11px', color: '#64748b', display: 'flex', gap: '10px' }}>
          <span>{lineCount} lines</span>
          <span>{charCount} chars</span>
        </div>
      </div>
    </div>
  );
};

export default MethodFramedCodeEditor;
