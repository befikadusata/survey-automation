'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  {
    label: 'Surveys',
    href: '/surveys',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M3 9h18M9 21V9" />
      </svg>
    ),
  },
  {
    label: 'New Survey',
    href: '/surveys/new',
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <Link href="/surveys" className="sidebar-logo">
        <div className="sidebar-logo-icon">📊</div>
        <span className="sidebar-logo-text">Survey<span>Mgr</span></span>
      </Link>

      <nav className="sidebar-nav">
        <div className="sidebar-label">Navigation</div>
        {navItems.map((item) => {
          const isActive =
            item.href === '/surveys'
              ? pathname === '/surveys' || (pathname.startsWith('/surveys/') && pathname !== '/surveys/new')
              : pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-link relative ${isActive ? 'active' : ''}`}
            >
              {isActive && <div className="absolute left-0 top-2 bottom-2 w-0.5 bg-primary rounded-r" />}
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ padding: '16px 20px', borderTop: '1px solid var(--sidebar-border)' }}>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Survey Manager v1.0</div>
      </div>
    </aside>
  );
}
