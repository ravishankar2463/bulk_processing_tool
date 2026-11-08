import React from 'react';
import { Layers, Cpu, Server, Zap, Sun, Moon, Activity, Settings } from 'lucide-react';

export interface AppHeaderProps {
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  activeTab: 'USER' | 'ADMIN';
  onSelectTab: (tab: 'USER' | 'ADMIN') => void;
  activeProcessingCount: number;
  dlqErrorCount: number;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  theme,
  onToggleTheme,
  activeTab,
  onSelectTab,
  activeProcessingCount,
  dlqErrorCount
}) => {
  return (
    <>
      {/* Top Telemetry & Health Bar with Theme Toggle */}
      <div 
        data-testid="telemetry-bar"
        style={{ 
          background: '#090d16', 
          borderBottom: '1px solid #1e293b', 
          padding: '6px 24px', 
          fontSize: '11px', 
          color: '#94a3b8' 
        }}
      >
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="pulsing-dot" style={{ background: '#10b981' }} />
              Camel Context: <strong style={{ color: '#f8fafc' }}>RUNNING</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Cpu size={12} color="#60a5fa" />
              Loom Virtual Threads: <strong style={{ color: '#f8fafc' }}>ACTIVE (O(1) RAM)</strong>
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Server size={12} color="#a78bfa" />
              Kafka Ingress: <strong style={{ color: '#f8fafc' }}>CONNECTED</strong>
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span className="headroom-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <Zap size={11} /> Headroom Token Optimizer Active (-74%)
            </span>

            {/* Liquid Glass Dual-Theme Toggle */}
            <button
              onClick={onToggleTheme}
              aria-label="Toggle Liquid Glass Theme"
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
                padding: '3px 9px',
                borderRadius: '6px',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              {theme === 'dark' ? <Sun size={12} color="#fbbf24" /> : <Moon size={12} color="#60a5fa" />}
              {theme === 'dark' ? 'Light Frost' : 'Dark Glass'}
            </button>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header style={{ 
        background: '#0f172a', 
        color: '#ffffff', 
        padding: '0 24px', 
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <div style={{ 
          maxWidth: '1200px', 
          margin: '0 auto', 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          height: '68px' 
        }}>
          {/* Logo and Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', 
              padding: '9px', 
              borderRadius: '10px', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(37,99,235,0.35)'
            }}>
              <Layers size={22} color="#ffffff" />
            </div>
            <div>
              <h1 style={{ fontSize: '18px', fontWeight: 700, margin: 0, letterSpacing: '-0.02em', color: '#ffffff' }}>
                Enterprise Bulk Processor
              </h1>
              <span style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 500 }}>
                Java 21 Project Loom · Apache Camel · Kafka
              </span>
            </div>
          </div>

          {/* Main Portal Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: '#1e293b', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => onSelectTab('USER')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'USER' ? '#2563eb' : 'transparent',
                color: activeTab === 'USER' ? '#ffffff' : '#94a3b8',
                border: 'none',
                boxShadow: activeTab === 'USER' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <Activity size={15} />
              User Portal
              {activeProcessingCount > 0 && (
                <span className="tabular-nums" style={{ 
                  background: activeTab === 'USER' ? '#ffffff' : '#2563eb', 
                  color: activeTab === 'USER' ? '#1d4ed8' : '#ffffff', 
                  fontSize: '10px', 
                  padding: '1px 6px', 
                  borderRadius: '999px',
                  fontWeight: 700 
                }}>
                  {activeProcessingCount}
                </span>
              )}
            </button>
            <button
              onClick={() => onSelectTab('ADMIN')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                background: activeTab === 'ADMIN' ? '#2563eb' : 'transparent',
                color: activeTab === 'ADMIN' ? '#ffffff' : '#94a3b8',
                border: 'none',
                boxShadow: activeTab === 'ADMIN' ? '0 1px 3px rgba(0,0,0,0.2)' : 'none'
              }}
            >
              <Settings size={15} />
              Admin Studio
              {dlqErrorCount > 0 && (
                <span className="tabular-nums" style={{ 
                  background: '#dc2626', 
                  color: '#ffffff', 
                  fontSize: '10px', 
                  padding: '1px 6px', 
                  borderRadius: '999px',
                  fontWeight: 700 
                }}>
                  {dlqErrorCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>
    </>
  );
};
