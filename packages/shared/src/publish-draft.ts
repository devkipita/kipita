/**
 * Rules for the "Publish a ride" draft that do not depend on React or the
 * browser, so the desktop and phone layouts decide the same way and the
 * decisions can be tested on their own.
 */

/** The answers a driver gives on the first five steps. */
export type DraftCore = {
  from: string;
  to: string;
  date: string;
  time: string;
  seats: number | null;
  price: string;
};

export type DraftProgress = {
  step?: number;
  maxStep?: number;
};

/**
 * True when there is nothing the driver chose: no town, day, time, seats or
 * price, and they never moved past the first step. An empty draft is neither
 * worth saving nor worth a "you will lose this" warning.
 */
export function isEmptyDraft(core: DraftCore, progress: DraftProgress = {}): boolean {
  return (
    core.from.trim() === "" &&
    core.to.trim() === "" &&
    core.date === "" &&
    core.time === "" &&
    core.seats == null &&
    core.price.trim() === "" &&
    (progress.step ?? 0) === 0 &&
    (progress.maxStep ?? 0) === 0
  );
}

/**
 * A saved draft is only restored for the account that made it. Drafts saved
 * before accounts were recorded carry no owner and are not trusted: on a shared
 * phone they could belong to anyone.
 */
export function isOwnDraft(savedOwner: string | undefined | null, userId: string): boolean {
  return !!userId && savedOwner === userId;
}

/** Two town names are the same town when they match ignoring case and spacing. */
export function sameTown(a: string, b: string): boolean {
  const left = a.trim().toLowerCase();
  return left !== "" && left === b.trim().toLowerCase();
}

/**
 * Puts the town the driver appears to be near first in the list, as a
 * suggestion they can tap. It never appears if it is the excluded town (the
 * destination already chosen) and is never listed twice.
 */
export function putNearTownFirst<T extends { name: string }>(
  towns: T[],
  near: T | null,
  excluded: string,
  limit: number,
): T[] {
  const rest = near ? towns.filter((t) => !sameTown(t.name, near.name)) : towns;
  const head = near && !sameTown(near.name, excluded) ? [near] : [];
  return [...head, ...rest].slice(0, limit);
}
