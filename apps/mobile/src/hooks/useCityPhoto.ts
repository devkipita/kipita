import { useEffect, useSyncExternalStore } from "react";
import {
  cityPhoto,
  ensureCityPhoto,
  subscribeCityPhotos,
} from "@/lib/utils/cityImage";

/**
 * The cached Wikipedia photo for a town, fetching it on first use.
 *
 * Returns null while loading and whenever the town has no usable image, so the
 * caller always renders its gradient fallback until a real photo lands.
 */
export function useCityPhoto(city?: string | null): string | null {
  useEffect(() => {
    ensureCityPhoto(city);
  }, [city]);

  return useSyncExternalStore(
    subscribeCityPhotos,
    () => cityPhoto(city),
    () => null,
  );
}
