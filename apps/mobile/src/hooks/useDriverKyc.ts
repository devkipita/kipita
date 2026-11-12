import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuthStore } from "@/store";
import { resolveAppUserId } from "@/lib/api/session";
import {
  fetchDriverProfile,
  type DriverProfile,
  type KycStatus,
} from "@/lib/api/driver";

export const DRIVER_KYC_KEY = ["driverProfile"] as const;

/**
 * Driver verification state for the current user.
 *
 * Passengers ride with no verification. Driving requires an approved
 * application; a pending one may still compose a ride, which the server parks
 * at `awaiting_approval` until an admin clears it (migration 047).
 *
 * The id is resolved from the database rather than read off the auth store,
 * because the store seeds `user.id` with the auth id until the profile loads.
 */
export function useDriverKyc() {
  const sessionToken = useAuthStore((s) => s.session?.access_token ?? null);

  const query = useQuery<DriverProfile | null>({
    queryKey: DRIVER_KYC_KEY,
    queryFn: async () => fetchDriverProfile(await resolveAppUserId()),
    enabled: Boolean(sessionToken),
    staleTime: 60 * 1000,
  });

  const status: KycStatus = query.data?.approval_status ?? "not_submitted";

  return {
    status,
    profile: query.data ?? null,
    hasApplied: status !== "not_submitted",
    isApproved: status === "approved",
    isPendingReview: status === "pending",
    isRejected: status === "rejected",
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
}

/** Pull the verification state again — call after a submit or an approval push. */
export function useRefreshDriverKyc() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: DRIVER_KYC_KEY });
}
