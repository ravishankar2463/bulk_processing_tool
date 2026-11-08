import React from 'react';
import { 
  ShieldCheck, 
  Cpu, 
  Split, 
  Database, 
  Code2,
  CheckCircle2,
  LucideIcon
} from 'lucide-react';

export interface ComponentTypeDefinition {
  type: string;
  label: string;
  shortLabel: string;
  role: string;
  icon: LucideIcon;
  color: string;
  accentGradient: string;
  lightBadgeBg: string;
  lightBadgeText: string;
  lightBadgeBorder: string;
  darkBadgeBg: string;
  darkBadgeText: string;
  darkBadgeBorder: string;
  cardBorderAccent: string;
  glowColor: string;
  methodHint: string;
  description: string;
}

export const COMPONENT_TYPES: Record<string, ComponentTypeDefinition> = {
  VALIDATOR: {
    type: 'VALIDATOR',
    label: 'Validator',
    shortLabel: 'Validator',
    role: 'Gatekeeper & Schema Guard',
    icon: ShieldCheck,
    color: '#059669',
    accentGradient: 'linear-gradient(90deg, #10b981 0%, #059669 100%)',
    lightBadgeBg: '#ecfdf5',
    lightBadgeText: '#047857',
    lightBadgeBorder: '#a7f3d0',
    darkBadgeBg: 'rgba(16, 185, 129, 0.16)',
    darkBadgeText: '#34d399',
    darkBadgeBorder: 'rgba(16, 185, 129, 0.35)',
    cardBorderAccent: '#10b981',
    glowColor: 'rgba(16, 185, 129, 0.12)',
    methodHint: 'validate(record, context) -> ValidationResult',
    description: 'Enforces business rules, regex formats, and schema contracts before processing'
  },
  BATCH_PROCESSOR: {
    type: 'BATCH_PROCESSOR',
    label: 'Batch Processor',
    shortLabel: 'Processor',
    role: 'Transform & Loom Virtual Thread',
    icon: Cpu,
    color: '#4f46e5',
    accentGradient: 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
    lightBadgeBg: '#eef2ff',
    lightBadgeText: '#4338ca',
    lightBadgeBorder: '#c7d2fe',
    darkBadgeBg: 'rgba(99, 102, 241, 0.16)',
    darkBadgeText: '#a5b4fc',
    darkBadgeBorder: 'rgba(99, 102, 241, 0.35)',
    cardBorderAccent: '#6366f1',
    glowColor: 'rgba(99, 102, 241, 0.12)',
    methodHint: 'process(record, context) -> Map<String, Object>',
    description: 'Enriches, transforms, and calculates business metrics concurrently on Loom threads'
  },
  SPLITTER: {
    type: 'SPLITTER',
    label: 'Streaming Splitter',
    shortLabel: 'Splitter',
    role: 'Zero-Copy Streaming Dechunker',
    icon: Split,
    color: '#d97706',
    accentGradient: 'linear-gradient(90deg, #f59e0b 0%, #d97706 100%)',
    lightBadgeBg: '#fffbeb',
    lightBadgeText: '#b45309',
    lightBadgeBorder: '#fde68a',
    darkBadgeBg: 'rgba(245, 158, 11, 0.16)',
    darkBadgeText: '#fbbf24',
    darkBadgeBorder: 'rgba(245, 158, 11, 0.35)',
    cardBorderAccent: '#f59e0b',
    glowColor: 'rgba(245, 158, 11, 0.12)',
    methodHint: 'split(in, chunkSize) -> List<Record>',
    description: 'Parses raw files into streaming micro-batches with Univocity and low heap impact'
  },
  REPORT_WRITER: {
    type: 'REPORT_WRITER',
    label: 'Report Writer & Sink',
    shortLabel: 'Writer',
    role: 'Immutable Audit & Ledger Sink',
    icon: Database,
    color: '#7c3aed',
    accentGradient: 'linear-gradient(90deg, #8b5cf6 0%, #7c3aed 100%)',
    lightBadgeBg: '#faf5ff',
    lightBadgeText: '#6d28d9',
    lightBadgeBorder: '#e9d5ff',
    darkBadgeBg: 'rgba(139, 92, 246, 0.16)',
    darkBadgeText: '#c4b5fd',
    darkBadgeBorder: 'rgba(139, 92, 246, 0.35)',
    cardBorderAccent: '#8b5cf6',
    glowColor: 'rgba(139, 92, 246, 0.12)',
    methodHint: 'sink(batch, context) -> void / summary',
    description: 'Appends processed records into cold storage, general ledgers, or audit logs'
  }
};

export const DEFAULT_COMPONENT_TYPE: ComponentTypeDefinition = {
  type: 'CUSTOM',
  label: 'Custom Component',
  shortLabel: 'Custom',
  role: 'Dynamic Java Script',
  icon: Code2,
  color: '#0284c7',
  accentGradient: 'linear-gradient(90deg, #0ea5e9 0%, #0284c7 100%)',
  lightBadgeBg: '#f0f9ff',
  lightBadgeText: '#0369a1',
  lightBadgeBorder: '#bae6fd',
  darkBadgeBg: 'rgba(14, 165, 233, 0.16)',
  darkBadgeText: '#38bdf8',
  darkBadgeBorder: 'rgba(14, 165, 233, 0.35)',
  cardBorderAccent: '#0ea5e9',
  glowColor: 'rgba(14, 165, 233, 0.12)',
  methodHint: 'execute(record, context) -> Object',
  description: 'Custom Java 21 dynamic script executed inside Janino compiler sandbox'
};

export function getComponentTypeMeta(rawType: string): ComponentTypeDefinition {
  const normalized = (rawType || '').trim().toUpperCase();
  if (normalized === 'WRITER') {
    return COMPONENT_TYPES.REPORT_WRITER;
  }
  return COMPONENT_TYPES[normalized] || {
    ...DEFAULT_COMPONENT_TYPE,
    type: rawType,
    label: rawType
  };
}
