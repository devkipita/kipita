/**
 * Matching a car to a pricing car type.
 *
 * Drivers pick a car type on the Price step (it sets the fuel use) and name their car on the next step.
 * The labels of the car types list example models, for instance "Small car (Vitz, Passo, Demio)", so a car
 * whose model is in one of those lists can be checked against the type the driver priced the trip with.
 * A model that is not listed matches nothing, and the driver's pick stands.
 */

type ClassLike = { code: string; label: string };

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/** "Small car (Vitz, Passo, Demio)" gives ["vitz", "passo", "demio"]. */
export function classExamples(label: string): string[] {
  const open = label.indexOf("(");
  if (open < 0) return [];
  return label
    .slice(open + 1)
    .replace(/\)\s*$/, "")
    .split(",")
    .map(squash)
    .filter((e) => e.length >= 3);
}

/** The name of a car type without its examples: "Small car (Vitz, Passo, Demio)" gives "Small car". */
export function className(label: string): string {
  const open = label.indexOf("(");
  return (open < 0 ? label : label.slice(0, open)).trim();
}

/** The car type a car is listed under, from its make and model, or null when the model is not a known one. */
export function classForCar<T extends ClassLike>(
  make: string | undefined,
  model: string | undefined,
  classes: readonly T[],
): T | null {
  const text = squash(`${make ?? ""}${model ?? ""}`);
  if (text.length < 3) return null;
  for (const c of classes) {
    if (classExamples(c.label).some((e) => text.includes(e))) return c;
  }
  return null;
}

// ───────────────────────── how many people a car type carries ─────────────────────────

/** The car type a trip is priced as when the driver has not picked one. */
const DEFAULT_CLASS = "sedan";

/** The most people a trip can carry besides the driver: the seats offered plus anyone riding along. */
export const MOST_PASSENGERS = 8;

/**
 * How many people each car type carries besides the driver. A car type that cannot hold the seats a
 * driver offers is never used to price the trip.
 *
 * Minivan takes the most a trip can list, because it is the biggest type there is. A Noah or Voxy itself
 * carries 6 or 7, so a van that really holds 8 is priced as the closest type until a bigger one is added.
 */
export const CLASS_PASSENGERS: Readonly<Record<string, number>> = {
  hatch: 4,
  sedan: 4,
  suv_petrol: 4,
  suv_diesel: 6,
  minivan: MOST_PASSENGERS,
};

/** How many people the car type carries besides the driver. A type that is not listed here takes the most. */
export function maxPassengersFor(code: string): number {
  return CLASS_PASSENGERS[code] ?? MOST_PASSENGERS;
}

/** Whether the car type carries this many people besides the driver. */
export function classHolds(code: string, people: number): boolean {
  return people <= maxPassengersFor(code);
}

/**
 * How many people can ride with the driver without booking a seat, on top of the seats offered: what the
 * car type carries, less the seats. Never negative.
 */
export function maxOthersFor(code: string, seats: number): number {
  return Math.max(0, maxPassengersFor(code) - seats);
}

/** The listed type with the fewest places that still carries this many people; the first one on a tie. */
export function smallestClassThatHolds<T extends { code: string }>(classes: readonly T[], people: number): T | null {
  let best: T | null = null;
  for (const c of classes) {
    if (!classHolds(c.code, people)) continue;
    if (best === null || maxPassengersFor(c.code) < maxPassengersFor(best.code)) best = c;
  }
  return best;
}

/**
 * The car type a trip is priced as. Only the seats offered decide it: people riding along with the driver
 * never move the trip to a bigger type, they are limited by the room the type has (`maxOthersFor`).
 *  1. A car we recognise by its make and model is priced as its own type, whatever was asked for.
 *  2. Otherwise the type the driver asked for, if it carries the seats offered.
 *  3. Otherwise the default type, if it carries them; failing that, the smallest type that does.
 *  4. If no type is big enough, the biggest, so the caller can say why it does not fit.
 */
export function pickVehicleClass<T extends ClassLike>(
  classes: readonly T[],
  want: {
    requested?: string;
    make?: string;
    model?: string;
    seats?: number;
  },
): T | null {
  if (classes.length === 0) return null;
  const seats = want.seats ?? 1;

  const known = classForCar(want.make, want.model, classes);
  if (known) return known;

  const asked = classes.find((c) => c.code === want.requested);
  if (asked && classHolds(asked.code, seats)) return asked;

  const standard = classes.find((c) => c.code === DEFAULT_CLASS);
  if (standard && classHolds(standard.code, seats)) return standard;

  const smallest = smallestClassThatHolds(classes, seats);
  if (smallest) return smallest;

  return classes.reduce((a, b) => (maxPassengersFor(b.code) > maxPassengersFor(a.code) ? b : a));
}

/**
 * Why a car type cannot carry the seats offered and the people riding along, in words for the driver.
 * The text says which of the two is the problem, so the screen can send the driver to the right place.
 */
export function carryLimitText(label: string, code: string, seats: number, others = 0): string {
  const name = className(label);
  const limit = maxPassengersFor(code);
  if (others > 0 && classHolds(code, seats)) {
    return `${name} carries up to ${limit} passengers. ${seats} seats and ${others} with you make ${seats + others}. Change one or pick a bigger car type.`;
  }
  return `${name} carries up to ${limit} passengers. You offered ${seats}. Offer fewer seats or pick a bigger car type.`;
}
