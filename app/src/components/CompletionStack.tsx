'use client';

import React from 'react';

interface Segment {
  key: string;
  color: string;
  label: string;
}

interface CompletionStackProps {
  total: number;
  data: Record<string, number>;
  segments: readonly Segment[];
}

export default function CompletionStack({ total, data, segments }: CompletionStackProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="completion-stack">
        {segments.map(seg => {
          const count = data[seg.key] ?? 0;
          const pct = total > 0 ? (count / total) * 100 : 0;
          if (pct === 0) return null;
          return (
            <div
              key={seg.key}
              className="stack-segment"
              style={{ flex: `0 0 ${pct}%`, background: seg.color, minWidth: 3 }}
              title={`${seg.label}: ${count} (${Math.round(pct)}%)`}
            />
          );
        })}
      </div>
      
      <div className="flex flex-wrap gap-4 mt-2">
        {segments.map(seg => {
          const count = data[seg.key] ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          return (
            <div key={seg.key} className="flex items-center gap-2 text-sm">
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: seg.color }} />
              <span className="text-muted">{seg.label}</span>
              <span className="font-bold">{count} ({pct}%)</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
