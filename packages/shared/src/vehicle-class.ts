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
