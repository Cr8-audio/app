import { useEffect } from 'react';
import { useRouter } from '@tanstack/react-router';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';

export function useKeyboardNavigation() {
  const router = useRouter();
  const user = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Only handle shortcuts when not typing in inputs
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        event.target instanceof HTMLSelectElement ||
        (event.target as any)?.isContentEditable
      ) {
        return;
      }

      // Global keyboard shortcuts
      if (event.metaKey || event.ctrlKey) {
        switch (event.key) {
          case '1':
            event.preventDefault();
            if (user?.username) {
              router.navigate({ to: `/${user.username}` });
            }
            break;
          case '2':
            event.preventDefault();
            if (user?.username) {
              router.navigate({ to: `/${user.username}/tracks` });
            }
            break;
          case '3':
            event.preventDefault();
            if (user?.username) {
              router.navigate({ to: `/${user.username}/playlists` });
            }
            break;
          case '4':
            event.preventDefault();
            if (user?.username) {
              router.navigate({ to: `/${user.username}/collection` });
            }
            break;
          case '5':
            event.preventDefault();
            router.navigate({ to: '/analyze' });
            break;
          case 'h':
            event.preventDefault();
            if (user?.username) {
              router.navigate({ to: `/${user.username}` });
            }
            break;
          case 'n':
            event.preventDefault();
            if (user?.username) {
              router.navigate({
                to: `/${user.username}/playlists/new`,
              });
            }
            break;
          case 'a':
            event.preventDefault();
            router.navigate({ to: '/analyze' });
            break;
        }
      }

      // Regular key shortcuts (without modifiers)
      switch (event.key) {
        case '?':
          event.preventDefault();
          // Show keyboard shortcuts help
          showKeyboardShortcuts();
          break;
        case 'Escape':
          // Close any open modals or overlays
          document.dispatchEvent(new CustomEvent('close-modals'));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [router, user]);
}

function showKeyboardShortcuts() {
  const shortcuts = [
    { key: '⌘K', description: 'Open command palette' },
    { key: '⌘B', description: 'Toggle sidebar' },
    { key: '⌘1', description: 'Go to dashboard' },
    { key: '⌘2', description: 'Go to tracks' },
    { key: '⌘3', description: 'Go to playlists' },
    { key: '⌘4', description: 'Go to collection' },
    { key: '⌘5', description: 'Go to analyze' },
    { key: '⌘H', description: 'Go to home' },
    { key: '⌘N', description: 'New playlist' },
    { key: '⌘A', description: 'Analyze track' },
    { key: '?', description: 'Show keyboard shortcuts' },
    { key: 'Esc', description: 'Close modals' },
  ];

  const modal = document.createElement('div');
  modal.className =
    'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center';
  modal.innerHTML = `
    <div class="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
      <h3 class="text-lg font-semibold mb-4">Keyboard Shortcuts</h3>
      <div class="space-y-2">
        ${shortcuts
          .map(
            ({ key, description }) => `
          <div class="flex items-center justify-between">
            <span class="text-sm text-gray-600">${description}</span>
            <kbd class="px-2 py-1 bg-gray-100 rounded text-xs font-mono">${key}</kbd>
          </div>
        `,
          )
          .join('')}
      </div>
      <div class="mt-6 flex justify-end">
        <button class="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90">
          Close
        </button>
      </div>
    </div>
  `;

  const closeModal = () => {
    document.body.removeChild(modal);
    document.removeEventListener('keydown', handleEscape);
  };

  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      closeModal();
    }
  };

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  modal.querySelector('button')?.addEventListener('click', closeModal);
  document.addEventListener('keydown', handleEscape);

  document.body.appendChild(modal);
}
