export interface Town {
  name: string;
  county: string;
  lat: number;
  lng: number;
}

export interface LatLngLike {
  lat: number;
  lng: number;
}

export const KENYAN_TOWNS: readonly Town[] = [
  { name: "Nairobi", county: "Nairobi", lat: -1.2921, lng: 36.8219 },
  { name: "Nairobi CBD", county: "Nairobi", lat: -1.2864, lng: 36.8172 },
  { name: "Westlands", county: "Nairobi", lat: -1.2674, lng: 36.811 },
  { name: "Karen", county: "Nairobi", lat: -1.3226, lng: 36.7085 },
  { name: "Langata", county: "Nairobi", lat: -1.3351, lng: 36.7522 },
  { name: "Kilimani", county: "Nairobi", lat: -1.2889, lng: 36.7842 },
  { name: "Lavington", county: "Nairobi", lat: -1.2798, lng: 36.7728 },
  { name: "South B", county: "Nairobi", lat: -1.3089, lng: 36.8372 },
  { name: "South C", county: "Nairobi", lat: -1.312, lng: 36.8257 },
  { name: "Eastleigh", county: "Nairobi", lat: -1.273, lng: 36.851 },
  { name: "Pangani", county: "Nairobi", lat: -1.2657, lng: 36.8382 },
  { name: "Kasarani", county: "Nairobi", lat: -1.2218, lng: 36.8974 },
  { name: "Roysambu", county: "Nairobi", lat: -1.2188, lng: 36.8746 },
  { name: "Kahawa", county: "Nairobi", lat: -1.1938, lng: 36.9258 },
  { name: "Ruiru", county: "Kiambu", lat: -1.147, lng: 36.9583 },
  { name: "Thika", county: "Kiambu", lat: -1.0396, lng: 37.09 },
  { name: "Juja", county: "Kiambu", lat: -1.1004, lng: 37.0131 },
  { name: "Kiambu Town", county: "Kiambu", lat: -1.1714, lng: 36.8259 },
  { name: "Limuru", county: "Kiambu", lat: -1.1063, lng: 36.6439 },
  { name: "Kikuyu", county: "Kiambu", lat: -1.2456, lng: 36.6647 },
  { name: "Githurai", county: "Kiambu", lat: -1.2049, lng: 36.909 },
  { name: "Gatundu", county: "Kiambu", lat: -1.0014, lng: 36.9101 },
  { name: "Mombasa", county: "Mombasa", lat: -4.0435, lng: 39.6682 },
  { name: "Nyali", county: "Mombasa", lat: -4.0258, lng: 39.7094 },
  { name: "Bamburi", county: "Mombasa", lat: -3.9857, lng: 39.7216 },
  { name: "Likoni", county: "Mombasa", lat: -4.073, lng: 39.659 },
  { name: "Diani", county: "Kwale", lat: -4.3163, lng: 39.5672 },
  { name: "Kisumu", county: "Kisumu", lat: -0.0917, lng: 34.768 },
  { name: "Nakuru", county: "Nakuru", lat: -0.3031, lng: 36.08 },
  { name: "Naivasha", county: "Nakuru", lat: -0.7167, lng: 36.4333 },
  { name: "Gilgil", county: "Nakuru", lat: -0.4945, lng: 36.3218 },
  { name: "Eldoret", county: "Uasin Gishu", lat: 0.5143, lng: 35.2698 },
  { name: "Nanyuki", county: "Laikipia", lat: 0.0068, lng: 37.0722 },
  { name: "Nyeri", county: "Nyeri", lat: -0.4201, lng: 36.9476 },
  { name: "Meru", county: "Meru", lat: 0.0463, lng: 37.6559 },
  { name: "Embu", county: "Embu", lat: -0.5388, lng: 37.4596 },
  { name: "Machakos", county: "Machakos", lat: -1.5222, lng: 37.2634 },
  { name: "Kitui", county: "Kitui", lat: -1.3672, lng: 38.0106 },
  { name: "Malindi", county: "Kilifi", lat: -3.2138, lng: 40.1169 },
  { name: "Kilifi", county: "Kilifi", lat: -3.6306, lng: 39.8499 },
  { name: "Lamu", county: "Lamu", lat: -2.2718, lng: 40.902 },
  { name: "Garissa", county: "Garissa", lat: -0.4532, lng: 39.6461 },
  { name: "Wajir", county: "Wajir", lat: 1.7471, lng: 40.0573 },
  { name: "Mandera", county: "Mandera", lat: 3.9373, lng: 41.8569 },
  { name: "Isiolo", county: "Isiolo", lat: 0.3541, lng: 37.5822 },
  { name: "Marsabit", county: "Marsabit", lat: 2.3347, lng: 37.99 },
  { name: "Moyale", county: "Marsabit", lat: 3.5267, lng: 39.05 },
  { name: "Kakamega", county: "Kakamega", lat: 0.2827, lng: 34.7519 },
  { name: "Bungoma", county: "Bungoma", lat: 0.5635, lng: 34.5607 },
  { name: "Busia", county: "Busia", lat: 0.4608, lng: 34.1115 },
  { name: "Kisii", county: "Kisii", lat: -0.6817, lng: 34.7668 },
  { name: "Nyamira", county: "Nyamira", lat: -0.5633, lng: 34.9341 },
  { name: "Migori", county: "Migori", lat: -1.0634, lng: 34.4731 },
  { name: "Homa Bay", county: "Homa Bay", lat: -0.5273, lng: 34.4571 },
  { name: "Siaya", county: "Siaya", lat: -0.0617, lng: 34.2883 },
  { name: "Kericho", county: "Kericho", lat: -0.3692, lng: 35.2863 },
  { name: "Bomet", county: "Bomet", lat: -0.7813, lng: 35.3428 },
  { name: "Narok", county: "Narok", lat: -1.0918, lng: 35.866 },
  { name: "Kajiado", county: "Kajiado", lat: -1.8517, lng: 36.7833 },
  { name: "Ngong", county: "Kajiado", lat: -1.3586, lng: 36.6588 },
  { name: "Kitengela", county: "Kajiado", lat: -1.4695, lng: 36.96 },
  { name: "Ongata Rongai", county: "Kajiado", lat: -1.3958, lng: 36.7553 },
  { name: "Namanga", county: "Kajiado", lat: -2.5488, lng: 36.79 },
  { name: "Nandi Hills", county: "Nandi", lat: 0.1022, lng: 35.1822 },
  { name: "Kapenguria", county: "West Pokot", lat: 1.2389, lng: 35.1087 },
  { name: "Lodwar", county: "Turkana", lat: 3.119, lng: 35.5977 },
  { name: "Maralal", county: "Samburu", lat: 1.1007, lng: 36.698 },
  { name: "Voi", county: "Taita Taveta", lat: -3.3932, lng: 38.5562 },
  { name: "Taveta", county: "Taita Taveta", lat: -3.3977, lng: 37.6747 },
  { name: "Wundanyi", county: "Taita Taveta", lat: -3.3967, lng: 38.3617 },
  { name: "Athi River", county: "Machakos", lat: -1.4551, lng: 36.9827 },
  { name: "Syokimau", county: "Machakos", lat: -1.3728, lng: 36.9357 },
  { name: "Mlolongo", county: "Machakos", lat: -1.3962, lng: 36.9414 },
  { name: "Mwea", county: "Kirinyaga", lat: -0.662, lng: 37.3614 },
  { name: "Kerugoya", county: "Kirinyaga", lat: -0.4973, lng: 37.2836 },
  { name: "Murang'a", county: "Murang'a", lat: -0.721, lng: 37.1527 },
  { name: "Karatina", county: "Nyeri", lat: -0.48, lng: 37.13 },
  { name: "Sagana", county: "Kirinyaga", lat: -0.6583, lng: 37.2033 },
  { name: "Kenol", county: "Murang'a", lat: -0.9706, lng: 37.0761 },
  { name: "Ol Kalou", county: "Nyandarua", lat: -0.2648, lng: 36.3787 },
  { name: "Naro Moru", county: "Nyeri", lat: -0.1667, lng: 37.0167 },
  { name: "Chuka", county: "Tharaka Nithi", lat: -0.3333, lng: 37.65 },
  { name: "Makindu", county: "Makueni", lat: -2.2833, lng: 37.8333 },
  { name: "Wote", county: "Makueni", lat: -1.7833, lng: 37.6278 },
  { name: "Sultan Hamud", county: "Makueni", lat: -2.0103, lng: 37.287 },
  { name: "Mtito Andei", county: "Makueni", lat: -2.6881, lng: 38.1698 },
  { name: "Konza", county: "Machakos", lat: -1.75, lng: 37.1167 },
  { name: "Kangundo", county: "Machakos", lat: -1.2833, lng: 37.3833 },
  { name: "Tala", county: "Machakos", lat: -1.3833, lng: 37.2833 },
  { name: "Matuu", county: "Machakos", lat: -1.15, lng: 37.5833 },
  { name: "Loitoktok", county: "Kajiado", lat: -2.7614, lng: 37.5108 },
  { name: "Mai Mahiu", county: "Nakuru", lat: -1.0694, lng: 36.5667 },
  { name: "Suswa", county: "Narok", lat: -1.1667, lng: 36.35 },
  { name: "Longonot", county: "Nakuru", lat: -0.9139, lng: 36.4464 },
  { name: "Sotik", county: "Bomet", lat: -0.6833, lng: 35.1167 },
  { name: "Litein", county: "Kericho", lat: -0.55, lng: 35.2167 },
  { name: "Londiani", county: "Kericho", lat: -0.1667, lng: 35.6 },
  { name: "Molo", county: "Nakuru", lat: -0.25, lng: 35.7333 },
  { name: "Elburgon", county: "Nakuru", lat: -0.2667, lng: 35.6833 },
  { name: "Njoro", county: "Nakuru", lat: -0.3333, lng: 35.95 },
  { name: "Subukia", county: "Nakuru", lat: -0.0667, lng: 36.15 },
  { name: "Bahati", county: "Nakuru", lat: -0.1333, lng: 36.1167 },
  { name: "Dundori", county: "Nakuru", lat: -0.1333, lng: 36.2333 },
  { name: "Webuye", county: "Bungoma", lat: 0.6167, lng: 34.7667 },
  { name: "Malaba", county: "Busia", lat: 0.6361, lng: 34.2756 },
  { name: "Mumias", county: "Kakamega", lat: 0.3348, lng: 34.4872 },
  { name: "Luanda", county: "Vihiga", lat: 0.0667, lng: 34.5833 },
  { name: "Mbale", county: "Vihiga", lat: 0.0861, lng: 34.7178 },
  { name: "Nambale", county: "Busia", lat: 0.4817, lng: 34.2481 },
  { name: "Butere", county: "Kakamega", lat: 0.2, lng: 34.5 },
  { name: "Ahero", county: "Kisumu", lat: -0.1833, lng: 34.9167 },
  { name: "Oyugis", county: "Homa Bay", lat: -0.5167, lng: 34.7333 },
  { name: "Rongo", county: "Migori", lat: -0.75, lng: 34.6 },
  { name: "Isebania", county: "Migori", lat: -1.1, lng: 34.45 },
  { name: "Keroka", county: "Nyamira", lat: -0.6833, lng: 34.9333 },
  { name: "Ogembo", county: "Kisii", lat: -0.65, lng: 34.7667 },
  { name: "Suneka", county: "Kisii", lat: -0.7833, lng: 34.7333 },
  { name: "Kilgoris", county: "Narok", lat: -1.0, lng: 34.8833 },
  { name: "Kapsabet", county: "Nandi", lat: 0.2017, lng: 35.1006 },
  { name: "Iten", county: "Elgeyo Marakwet", lat: 0.6667, lng: 35.5 },
  { name: "Eldama Ravine", county: "Baringo", lat: 0.05, lng: 35.7167 },
  { name: "Kabarnet", county: "Baringo", lat: 0.4833, lng: 35.75 },
  { name: "Marigat", county: "Baringo", lat: 0.4667, lng: 36.05 },
  { name: "Burnt Forest", county: "Uasin Gishu", lat: 0.3167, lng: 35.4333 },
  { name: "Turbo", county: "Uasin Gishu", lat: 0.6333, lng: 35.0833 },
  { name: "Moiben", county: "Uasin Gishu", lat: 0.8167, lng: 35.45 },
  { name: "Maua", county: "Meru", lat: 0.2333, lng: 37.95 },
  { name: "Timau", county: "Meru", lat: 0.0833, lng: 37.25 },
  { name: "JKIA", county: "Nairobi", lat: -1.3192, lng: 36.9278 },
  { name: "Wilson Airport", county: "Nairobi", lat: -1.3214, lng: 36.8158 },
  { name: "Moi Airport", county: "Mombasa", lat: -4.0348, lng: 39.5942 },
  { name: "Eldoret Airport", county: "Uasin Gishu", lat: 0.4044, lng: 35.2389 },
  { name: "Ukunda", county: "Kwale", lat: -4.2932, lng: 39.5719 },
  { name: "Mariakani", county: "Kilifi", lat: -3.8587, lng: 39.4701 },
  { name: "Mtwapa", county: "Kilifi", lat: -3.9457, lng: 39.7366 },
  { name: "Watamu", county: "Kilifi", lat: -3.354, lng: 40.0244 },
  { name: "Nkubu", county: "Meru", lat: -0.0667, lng: 37.65 },
  { name: "Kangema", county: "Murang'a", lat: -0.6833, lng: 36.9667 },
  { name: "Engineer", county: "Nyandarua", lat: -0.45, lng: 36.4333 },
  { name: "Kinangop", county: "Nyandarua", lat: -0.6333, lng: 36.4833 },
  { name: "Kitale", county: "Trans Nzoia", lat: 1.0157, lng: 35.0062 },
];

export const KENYA_BOUNDS = {
  west: 33.5,
  south: -5.0,
  east: 42.2,
  north: 5.6,
} as const;

function normalise(value: string): string {
  return value.trim().toLowerCase();
}

const BY_NAME = new Map<string, Town>(
  KENYAN_TOWNS.map((town) => [normalise(town.name), town]),
);

const BY_LENGTH_DESC: readonly Town[] = [...KENYAN_TOWNS].sort(
  (a, b) => b.name.length - a.name.length,
);

export function findTown(name: string | null | undefined): Town | null {
  if (!name) return null;
  return BY_NAME.get(normalise(name)) ?? null;
}

export function searchTowns(query: string, limit = 6): Town[] {
  const q = normalise(query);
  if (!q) return [];

  const scored: Array<{ town: Town; rank: number }> = [];
  for (const town of KENYAN_TOWNS) {
    const name = normalise(town.name);
    const county = normalise(town.county);

    let rank: number;
    if (name === q) rank = 0;
    else if (name.startsWith(q)) rank = 1;
    else if (name.includes(q)) rank = 2;
    else if (county.startsWith(q)) rank = 3;
    else if (county.includes(q)) rank = 4;
    else continue;

    scored.push({ town, rank });
  }

  return scored
    .sort((a, b) => a.rank - b.rank)
    .slice(0, limit)
    .map((entry) => entry.town);
}

export function matchTownInText(text: string | null | undefined): Town | null {
  if (!text) return null;
  const haystack = ` ${normalise(text).replace(/[^a-z0-9']+/g, " ")} `;
  if (haystack.trim().length === 0) return null;

  for (const town of BY_LENGTH_DESC) {
    const needle = ` ${normalise(town.name).replace(/[^a-z0-9']+/g, " ")} `;
    if (haystack.includes(needle)) return town;
  }
  return null;
}

export function resolveTown(value: string | null | undefined): Town | null {
  return findTown(value) ?? matchTownInText(value);
}

const EARTH_RADIUS_KM = 6371;

function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

export function haversineKm(a: LatLngLike, b: LatLngLike): number {
  const dLat = toRadians(b.lat - a.lat);
  const dLng = toRadians(b.lng - a.lng);
  const lat1 = toRadians(a.lat);
  const lat2 = toRadians(b.lat);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

export function findNearestTown(coords: LatLngLike, maxKm = 250): Town | null {
  let best: Town | null = null;
  let bestKm = Infinity;

  for (const town of KENYAN_TOWNS) {
    const km = haversineKm(coords, town);
    if (km < bestKm) {
      bestKm = km;
      best = town;
    }
  }

  return best && bestKm <= maxKm ? best : null;
}

export function townsNear(
  coords: LatLngLike,
  radiusKm = 60,
  limit = 6,
): Town[] {
  return KENYAN_TOWNS.map((town) => ({ town, km: haversineKm(coords, town) }))
    .filter((entry) => entry.km <= radiusKm)
    .sort((a, b) => a.km - b.km)
    .slice(0, limit)
    .map((entry) => entry.town);
}

export interface PopularRoute {
  from: string;
  to: string;
  blurb: string;
}

export const POPULAR_ROUTES: readonly PopularRoute[] = [
  { from: "Nairobi", to: "Mombasa", blurb: "The coast run" },
  { from: "Nairobi", to: "Nakuru", blurb: "Up the escarpment" },
  { from: "Nairobi", to: "Kisumu", blurb: "Straight to the lake" },
  { from: "Nairobi", to: "Eldoret", blurb: "Rift Valley express" },
  { from: "Nairobi", to: "Nyeri", blurb: "Mount Kenya way" },
  { from: "Nairobi", to: "Thika", blurb: "The quick one" },
  { from: "Mombasa", to: "Malindi", blurb: "Along the shore" },
  { from: "Nakuru", to: "Naivasha", blurb: "Lake to lake" },
];
