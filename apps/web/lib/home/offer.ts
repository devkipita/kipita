export type RideOffer = {
  id: string;
  title: string;
  code: string | null;
  percentOff: number;
};

export function discountedFare(price: number, percentOff: number): number {
  return Math.round(price * (1 - percentOff / 100));
}
