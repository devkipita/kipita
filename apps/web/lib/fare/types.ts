import type { FareConfig, ResolvedFuelPrice, VehicleClass } from "@kipita/shared";

/**
 * What the publish screen needs to price a trip. The browser works out the range for any number of
 * seats from this with the shared fare functions, so changing seats never waits on the network.
 */
export type PriceQuote =
  | {
      available: true;
      /** estimated road distance, in km */
      distanceKm: number;
      vehicleClass: string;
      classes: Array<{ code: string; label: string }>;
      vehicle: VehicleClass;
      fuel: ResolvedFuelPrice;
      config: FareConfig;
    }
  | { available: false; reason: PriceUnavailableReason };

export type PriceUnavailableReason =
  /** one of the two towns is not one Kipita can measure */
  | "no_route"
  /** the fuel price tables are not set up yet */
  | "not_ready"
  /** no fuel price has been entered for this fuel */
  | "no_fuel_price"
  | "error";
