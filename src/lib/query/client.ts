import { QueryClient } from "@tanstack/react-query";

/**
 * The single app-wide QueryClient.
 *
 * Exported from its own module (not created inline in the root layout) so
 * non-React code — the realtime gateway, the outbox flusher — can patch the
 * cache with `setQueryData` / `invalidateQueries` without prop-drilling.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 30_000,
      // Realtime pushes keep data fresh; refetch on reconnect/focus is the
      // safety net (wired in lifecycle.ts).
      refetchOnReconnect: true,
      refetchOnWindowFocus: true,
    },
  },
});
