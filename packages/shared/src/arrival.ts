/**
 * Where a passenger's ride ended is the car's last point, saved when they tapped "I've arrived" or
 * when the driver ended the ride. If the driver's signal had dropped, that point is old, so the
 * place is shown as approximate.
 */
export const APPROX_AFTER_MS = 3 * 60_000;

export function isApproxArrival(arrivedAt: string | null, positionAt: string | null): boolean {
  if (!arrivedAt || !positionAt) return false;
  const gap = new Date(arrivedAt).getTime() - new Date(positionAt).getTime();
  return Number.isFinite(gap) && gap > APPROX_AFTER_MS;
}
