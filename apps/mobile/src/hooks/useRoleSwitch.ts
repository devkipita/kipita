import { useCallback } from "react";
import { useAppMode } from "./useAppMode";
import { useDriverKyc } from "./useDriverKyc";
import { useUIStore } from "@/store";

/**
 * Guards the passenger↔driver switch. Passenger is always allowed; switching to
 * driver first requires driver KYC — if the user hasn't applied, we open the
 * KYC sheet and only flip the mode once they've submitted (via returnAction).
 */
export function useRoleSwitch() {
  const { mode, setMode } = useAppMode();
  const { hasApplied, isRejected } = useDriverKyc();
  const openSheet = useUIStore((s) => s.openSheet);

  const requestToggle = useCallback(() => {
    if (mode === "driver") {
      setMode("passenger");
      return;
    }
    // A rejected application is back to square one: send them to resubmit
    // rather than into a driver mode that cannot publish anything.
    if (hasApplied && !isRejected) {
      setMode("driver");
      return;
    }
    openSheet("driver_kyc", { returnAction: () => setMode("driver") });
  }, [mode, setMode, hasApplied, isRejected, openSheet]);

  return { requestToggle, mode, isDriver: mode === "driver" };
}
