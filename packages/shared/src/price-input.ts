/**
 * The whole shillings in what a driver typed or pasted into a price box.
 *
 * Prices are whole shillings. A decimal point ends the amount: "900.5" and "900.50" are 900, not 9005.
 * Thousands separators and any other characters are dropped, leading zeros go, and the length is capped.
 */
export function wholeShillings(raw: string, maxDigits = 6): string {
  const whole = raw.split(".")[0] ?? "";
  return whole.replace(/\D/g, "").replace(/^0+/, "").slice(0, maxDigits);
}
