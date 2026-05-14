'use client';

import React from 'react';

interface AlertProps {
  children: React.ReactNode;
  variant?: 'success' | 'danger' | 'info';
  className?: string;
  onClose?: () => void;
}

export default function Alert({
  children,
  variant = 'info',
  className = '',
  onClose
}: AlertProps) {
  return (
    <div className={`alert alert-${variant} ${className}`} role="alert">
      <div style={{ flex: 1 }}>
        {children}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: 'inherit',
            cursor: 'pointer',
            padding: '0 4px',
            fontSize: '18px',
            lineHeight: 1,
            opacity: 0.7
          }}
          aria-label="Close alert"
        >
          &times;
        </button>
      )}
    </div>
  );
}
