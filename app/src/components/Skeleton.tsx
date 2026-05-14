'use client';

import React from 'react';

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  circle?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export default function Skeleton({
  width,
  height,
  circle = false,
  className = '',
  style = {}
}: SkeletonProps) {
  const customStyle: React.CSSProperties = {
    width: width,
    height: height,
    borderRadius: circle ? '50%' : undefined,
    ...style
  };

  return (
    <div className={`skeleton ${className}`} style={customStyle} />
  );
}
