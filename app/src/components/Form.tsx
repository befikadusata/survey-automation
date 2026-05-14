'use client';

import React from 'react';

interface LabelProps extends React.LabelHTMLAttributes<HTMLLabelElement> {
  children: React.ReactNode;
}

export function Label({ children, className = '', ...props }: LabelProps) {
  return (
    <label className={`form-label ${className}`} {...props}>
      {children}
    </label>
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: InputProps) {
  return (
    <input className={`form-input ${className}`} {...props} />
  );
}

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export function Select({ children, className = '', ...props }: SelectProps) {
  return (
    <div style={{ position: 'relative' }}>
      <select className={`form-select ${className}`} {...props}>
        {children}
      </select>
      <div style={{
        position: 'absolute',
        right: 12,
        top: '50%',
        transform: 'translateY(-50%)',
        pointerEvents: 'none',
        color: 'var(--text-muted)'
      }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export function Textarea({ className = '', ...props }: TextareaProps) {
  return (
    <textarea className={`form-textarea ${className}`} {...props} />
  );
}

export function FormGroup({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`form-group ${className}`}>
      {children}
    </div>
  );
}

export function FormHint({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={`form-hint ${className}`}>
      {children}
    </span>
  );
}
