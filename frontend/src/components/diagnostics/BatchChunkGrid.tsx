import React from 'react';
import { BatchChunk } from '../../types/process';

export interface BatchChunkGridProps {
  batchChunks: ReadonlyArray<BatchChunk>;
  selectedBatchIndex: number | null;
  onSelectBatchIndex: (index: number | null) => void;
}

export const BatchChunkGrid: React.FC<BatchChunkGridProps> = React.memo(({
  batchChunks,
  selectedBatchIndex,
  onSelectBatchIndex
}) => {
  return (
    <div data-testid="diagnostics-chunk-distribution" style={{ marginBottom: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Batch Chunk Distribution
        </div>
        {selectedBatchIndex !== null && (
          <button
            data-testid="clear-batch-filter-btn"
            onClick={() => onSelectBatchIndex(null)}
            style={{
              fontSize: '11px',
              color: 'var(--primary)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Clear Batch Filter (Show All)
          </button>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '8px' }}>
        {batchChunks.map((chunk) => {
          const isSelected = selectedBatchIndex === chunk.chunkIndex;
          const successCount = chunk.successfulCount ?? Math.max(0, chunk.recordCount - (chunk.failedCount || 0));
          const failCount = chunk.failedCount ?? 0;

          return (
            <div 
              key={chunk.chunkIndex} 
              data-testid={`chunk-card-${chunk.chunkIndex}`} 
              onClick={() => onSelectBatchIndex(isSelected ? null : chunk.chunkIndex)}
              style={{ 
                padding: '10px 12px', 
                borderRadius: '8px', 
                border: isSelected ? '2px solid var(--primary)' : '1px solid var(--border-subtle)', 
                background: isSelected ? 'var(--primary-light)' : 'var(--bg-card)', 
                fontSize: '11px',
                cursor: 'pointer',
                boxShadow: isSelected ? '0 2px 8px rgba(37,99,235,0.2)' : 'none',
                transition: 'all var(--transition-spring)'
              }}
            >
              <div style={{ fontWeight: 700, color: isSelected ? 'var(--primary)' : 'var(--text-main)', marginBottom: '2px', display: 'flex', justifyContent: 'space-between' }}>
                <span>{`Chunk #${chunk.chunkIndex} (${chunk.partitionId})`}</span>
              </div>
              <div className="tabular-nums" style={{ color: 'var(--text-muted)' }}>Records: {chunk.recordCount.toLocaleString('en-US')}</div>
              <div className="tabular-nums" style={{ color: 'var(--text-muted)' }}>Duration: {chunk.durationMicros.toLocaleString('en-US')} µs</div>
              
              {/* Success / Failure counts per batch chunk */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px' }}>
                <span style={{ color: 'var(--success)', fontWeight: 600 }} className="tabular-nums">
                  ✓ {successCount.toLocaleString('en-US')}
                </span>
                {failCount > 0 ? (
                  <span style={{ color: 'var(--danger)', fontWeight: 700 }} className="tabular-nums">
                    ✗ {failCount.toLocaleString('en-US')}
                  </span>
                ) : (
                  <span style={{ color: 'var(--text-muted)' }}>0 err</span>
                )}
              </div>

              <span style={{ 
                fontSize: '10px', 
                color: chunk.status === 'DONE' ? 'var(--success)' : chunk.status === 'FAILED' ? 'var(--danger)' : 'var(--primary)', 
                fontWeight: 700, 
                display: 'inline-block', 
                marginTop: '4px' 
              }}>
                ● {chunk.status}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
});

BatchChunkGrid.displayName = 'BatchChunkGrid';
