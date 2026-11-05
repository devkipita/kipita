export type LoadSize = "small_parcel" | "boot" | "pickup_load" | "large_heavy";
export type VehicleClass = "car" | "suv" | "pickup" | "closed_van" | "truck";

export const LOAD_SIZES: { key: LoadSize; label: string }[] = [
  { key: "small_parcel", label: "Small parcel" },
  { key: "boot", label: "Fits in a boot" },
  { key: "pickup_load", label: "Pickup load" },
  { key: "large_heavy", label: "Large / heavy" },
];

export const VEHICLE_CLASSES: { key: VehicleClass; label: string }[] = [
  { key: "car", label: "Car" },
  { key: "suv", label: "SUV" },
  { key: "pickup", label: "Pickup" },
  { key: "closed_van", label: "Closed van" },
  { key: "truck", label: "Truck" },
];

export const VEHICLE_LABEL: Record<VehicleClass, string> = {
  car: "Car",
  suv: "SUV",
  pickup: "Pickup",
  closed_van: "Closed van",
  truck: "Truck",
};

export type CapacityPerson = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  is_verified: boolean;
  rating: number | null;
};

export type Capacity = {
  id: string;
  from_location: string;
  to_location: string;
  depart_date: string;
  depart_time: string | null;
  vehicle_type: VehicleClass;
  max_load: LoadSize;
  capacity_note: string | null;
  price_from: number | null;
  quote_only: boolean;
  driver: CapacityPerson | null;
};
