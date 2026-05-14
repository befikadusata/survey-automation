'use client';

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  asChild?: boolean;
}

export default function Button({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  asChild = false,
  ...props
}: ButtonProps) {
  const baseClass = 'btn';
  const variantClass = `btn-${variant}`;
  const sizeClass = size !== 'md' ? `btn-${size}` : '';
  
  const combinedClasses = `${baseClass} ${variantClass} ${sizeClass} ${className}`.trim();

  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<{ className?: string }>, {
      className: `${combinedClasses} ${(children.props as { className?: string }).className || ''}`.trim(),
      ...props,
    });
  }

  return (
    <button
      className={combinedClasses}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && <span className="spinner" style={{ marginRight: children ? 8 : 0 }} />}
      {!isLoading && leftIcon && <span style={{ display: 'inline-flex', marginRight: 8 }}>{leftIcon}</span>}
      {children}
      {!isLoading && rightIcon && <span style={{ display: 'inline-flex', marginLeft: 8 }}>{rightIcon}</span>}
    </button>
  );
}
