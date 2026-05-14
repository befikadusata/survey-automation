'use client';

import React from 'react';
import Skeleton from './Skeleton';

interface StatCardProps {
  label: string;
  value: number;
  total: number;
  color: string;
  loading?: boolean;
}

export default function StatCard({ label, value, total, color, loading = false }: StatCardProps) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  
  if (loading) {
    return (
      <div className="stat-card">
        <Skeleton width="60%" height={12} style={{ marginBottom: 8 }} />
        <Skeleton width="40%" height={32} style={{ marginBottom: 8 }} />
        <Skeleton width="80%" height={12} style={{ marginBottom: 12 }} />
        <Skeleton height={6} circle />
      </div>
    );
  }

  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color }}>{value.toLocaleString()}</div>
      <div className="stat-pct">{pct}% of respondents</div>
      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}
