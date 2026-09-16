import { ReactElement, ReactNode } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { ConvexProvider, ConvexReactClient } from 'convex/react';

// Mock Convex client for testing
const mockConvexClient = {
  // Add mock methods as needed
} as unknown as ConvexReactClient;

interface ProvidersProps {
  children: ReactNode;
}

/**
 * Wrapper component that provides all necessary context providers for testing
 */
function AllProviders({ children }: ProvidersProps) {
  return <ConvexProvider client={mockConvexClient}>{children}</ConvexProvider>;
}

/**
 * Custom render function that wraps components with all providers
 */
function customRender(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>,
) {
  return render(ui, { wrapper: AllProviders, ...options });
}

// Re-export everything from testing-library
export * from '@testing-library/react';
export { userEvent } from '@testing-library/user-event';

// Override render with custom render
export { customRender as render };

/**
 * Helper to create mock user data for tests
 */
export function createMockUser(overrides = {}) {
  return {
    _id: 'test-user-id',
    email: 'test@example.com',
    username: 'testuser',
    displayName: 'Test User',
    avatarUrl: null,
    onboardingComplete: true,
    onboardingStep: 'complete' as const,
    ...overrides,
  };
}

/**
 * Helper to create mock Convex auth state
 */
export function createMockAuthState(overrides = {}) {
  return {
    isLoading: false,
    isAuthenticated: true,
    ...overrides,
  };
}
