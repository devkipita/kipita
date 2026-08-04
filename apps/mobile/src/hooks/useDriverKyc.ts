import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store";
import { fetchDriverProfile, type KycStatus } from "@/lib/api/driver";

/**
 * Driver KYC state for the current user. `hasApplied` is the gate for driver
 * mode: a passenger becomes usable instantly, but driving requires that
 * identity details have been submitted at least once (status leaves
 * `not_submitted`). Approval itself is reviewed out-of-band.
 */
export function useDriverKyc() {
  const userId = useAuthStore((s) => s.user?.id ?? null);

  const query = useQuery({
    queryKey: ["driverProfile", userId],
    queryFn: () => fetchDriverProfile(userId!),
    enabled: Boolean(userId),
    staleTime: 60 * 1000,
  });

  const status: KycStatus = query.data?.approval_status ?? "not_submitted";

  return {
    status,
    hasApplied: status !== "not_submitted",
    isApproved: status === "approved",
    isLoading: query.isLoading,
    profile: query.data ?? null,
  };
}
