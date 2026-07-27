import { useCallback } from "react";
import { useRouter } from "expo-router";

/**
 * A back handler that never throws the "GO_BACK was not handled" warning.
 * When there's history it pops; otherwise it falls back to a safe route
 * (home) — which happens on deep links or screens reached via `replace`.
 */
export function useSafeBack(fallback = "/(tabs)/home") {
  const router = useRouter();
  return useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace(fallback as never);
    }
  }, [router, fallback]);
}
