'use client';

import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'sm';
}

export function Card({ children, className = '', variant = 'default' }: CardProps) {
  const baseClass = variant === 'sm' ? 'card-sm' : 'card';
  return (
    <div className={`${baseClass} ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`page-header ${className}`} style={{ marginBottom: 16 }}>
      {children}
    </div>
  );
}

export function CardTitle({ children, className = '', style = {} }: { children: React.ReactNode; className?: string, style?: React.CSSProperties }) {
  return (
    <h3 className={className} style={{ marginBottom: 4, ...style }}>
      {children}
    </h3>
  );
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`page-subtitle ${className}`}>
      {children}
    </p>
  );
}

export function CardContent({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`page-header-actions ${className}`} style={{ marginTop: 16, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
      {children}
    </div>
  );
}
