'use client';

import { useState, useEffect, useCallback } from 'react';
import { Link, useRouterState } from '@tanstack/react-router';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PersistentPlayer from '@/lib/components/ui/persistent-player';
import { X, Home } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

interface AppLayoutProps {
  children: React.ReactNode;
}

function ChatHomeChrome({ children }: { children: React.ReactNode }) {
  const { username, displayName } = useAuth();
  const tracks = useQuery(api.tracks.getUserTracks);
  const trackCount = tracks?.length;

  return (
    <div className="crate-chat-home flex h-screen flex-col overflow-hidden bg-[var(--crate-void)] text-[var(--crate-ink)]">
      {/* Minimal identity + crate status — no sidebar/topbar */}
      <header className="flex h-12 flex-shrink-0 items-center justify-between border-b border-[var(--crate-rule)] px-4">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/analyze/chat"
            className="text-sm font-semibold tracking-tight text-[var(--crate-ink)]"
          >
            Crate
          </Link>
          <span
            className="hidden h-1 w-1 rounded-full bg-[var(--crate-rule)] sm:inline-block"
            aria-hidden
          />
          <p className="truncate text-xs text-[var(--crate-ink-muted)]">
            {displayName || username || 'DJ'}
            {typeof trackCount === 'number' ? (
              <span className="font-mono"> · {trackCount} in crate</span>
            ) : (
              <span> · loading crate…</span>
            )}
          </p>
        </div>
        {username ? (
          <Link
            to="/$username"
            params={{ username }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-chip)] border border-[var(--crate-rule)] bg-[var(--crate-panel)] px-2.5 py-1 text-[10px] text-[var(--crate-ink-muted)] transition-colors duration-150 ease-out hover:bg-[var(--crate-accent-soft)] hover:text-[var(--crate-ink)]"
            title="Overview (dashboard)"
          >
            <Home className="h-3 w-3" aria-hidden />
            Overview
          </Link>
        ) : null}
      </header>

      <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>

      <div className="flex-shrink-0 z-[60]">
        <PersistentPlayer />
      </div>
    </div>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isChatHome = pathname === '/analyze/chat';
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Enable keyboard navigation
  useKeyboardNavigation();

  // Handle responsive behavior and persistence
  useEffect(() => {
    // Check localStorage for sidebar state
    const savedState = localStorage.getItem('crate-sidebar-collapsed');
    if (savedState !== null) {
      setSidebarCollapsed(JSON.parse(savedState));
    }

    const handleResize = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);

      // On mobile, always start with sidebar collapsed
      if (mobile) {
        setSidebarCollapsed(true);
        setMobileMenuOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Persist sidebar state
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('crate-sidebar-collapsed', JSON.stringify(next));
      return next;
    });
  }, []);

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuOpen && isMobile) {
        const sidebar = document.getElementById('sidebar');
        if (sidebar && !sidebar.contains(event.target as Node)) {
          setMobileMenuOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, isMobile]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // CMD/Ctrl + B to toggle sidebar (skip on chat-home — no sidebar)
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        if (isChatHome) return;
        event.preventDefault();
        if (isMobile) {
          setMobileMenuOpen(!mobileMenuOpen);
        } else {
          toggleSidebar();
        }
      }

      // CMD/Ctrl + K for search (handled by TopBar)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        if (isChatHome) return;
        event.preventDefault();
        // Focus search input
        const searchInput = document.querySelector(
          'input[placeholder*="Search"]',
        ) as HTMLInputElement;
        searchInput?.focus();
      }

      // Escape to close mobile menu
      if (event.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarCollapsed, mobileMenuOpen, isMobile, isChatHome, toggleSidebar]);

  // Don't render navigation for unauthenticated users
  if (!isAuthenticated) {
    return <div className="min-h-screen">{children}</div>;
  }

  // Chat is primary home — void shell, no sidebar/topbar
  if (isChatHome) {
    return <ChatHomeChrome>{children}</ChatHomeChrome>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-muted">
      {/* Mobile Menu Overlay */}
      {isMobile && mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-[55] md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Wrapper */}
        <div
          id="sidebar"
          className={cn(
            'transition-all duration-300 z-[60] bg-card border-r border-border flex-shrink-0',
            isMobile
              ? cn(
                  'fixed inset-y-0 left-0 h-full',
                  mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
                )
              : cn('relative', sidebarCollapsed ? 'w-16' : 'w-64'),
          )}
        >
          <Sidebar
            collapsed={!isMobile && sidebarCollapsed}
            onToggle={() => {
              if (isMobile) {
                setMobileMenuOpen(!mobileMenuOpen);
              } else {
                toggleSidebar();
              }
            }}
          />
        </div>

        {/* Main Content Wrapper */}
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          {/* Top Bar */}
          <TopBar
            sidebarCollapsed={sidebarCollapsed}
            onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
            mobileMenuOpen={mobileMenuOpen}
          />

          {/* Scrollable Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 max-w-7xl mx-auto">{children}</div>
          </main>
        </div>
      </div>

      {/* Mobile Navigation Helper */}
      {isMobile && (
        <div className="fixed bottom-24 right-4 flex flex-col space-y-2 z-30 pointer-events-none">
          {/* Quick access button for mobile - moved up to avoid player if present */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="pointer-events-auto w-12 h-12 bg-primary text-primary-foreground rounded-full shadow-lg flex items-center justify-center hover:bg-primary/90 transition-colors border border-border"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 active:text-primary transition-colors" />
            ) : (
              <svg
                className="w-6 h-6 active:text-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            )}
          </button>
        </div>
      )}

      {/* Persistent Music Player - Stacks at bottom */}
      <div className="flex-shrink-0 z-[60]">
        <PersistentPlayer />
      </div>
    </div>
  );
}
