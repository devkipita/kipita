import { useCallback } from 'react';
import { useAuthStore, useUIStore } from '@/store';

/**
 * Wraps an action so it opens the AuthSheet if user is not authenticated,
 * then resumes the action on success. Preserves interrupted action.
 */
export function useProtectedAction() {
  const user = useAuthStore(s => s.user);
  const openSheet = useUIStore(s => s.openSheet);

  const protect = useCallback(
    (action: () => void) => {
      if (user) {
        action();
      } else {
        openSheet('auth', { returnAction: action });
      }
    },
    [user, openSheet],
  );

  return protect;
}
