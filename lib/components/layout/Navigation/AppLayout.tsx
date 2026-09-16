'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/hooks/useAuth';
import { cn } from '@/lib/utils/tailwind';
import { useKeyboardNavigation } from '@/lib/hooks/useKeyboardNavigation';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import PersistentPlayer from '@/lib/components/ui/persistent-player';
import { X } from 'lucide-react';

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { isAuthenticated } = useAuth();
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
  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('crate-sidebar-collapsed', JSON.stringify(newState));
  };

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
      // CMD/Ctrl + B to toggle sidebar
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        if (isMobile) {
          setMobileMenuOpen(!mobileMenuOpen);
        } else {
          toggleSidebar();
        }
      }

      // CMD/Ctrl + K for search (handled by TopBar)
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
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
  }, [sidebarCollapsed, mobileMenuOpen, isMobile]);

  // Don't render navigation for unauthenticated users
  if (!isAuthenticated) {
    return <div className="min-h-screen">{children}</div>;
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden bg-gray-50">
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
            'transition-all duration-300 z-[60] bg-white border-r border-gray-800 flex-shrink-0',
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
            className="pointer-events-auto w-12 h-12 bg-main text-black rounded-full shadow-lg flex items-center justify-center hover:bg-mainAccent transition-colors border-2 border-black"
            aria-label="Toggle navigation"
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 active:text-main transition-colors" />
            ) : (
              <svg
                className="w-6 h-6 active:text-main transition-colors"
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
