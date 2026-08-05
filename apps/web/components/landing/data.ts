/**
 * Curated marketing data for the landing sections that are illustrative rather
 * than live (the ride-requests carousel, road alerts, and headline stats).
 * The interactive ride search reads live data from Supabase — see lib/rides.ts.
 */

export type RideCardData = {
  card: string;
  av: string;
  avText: string;
  initials: string;
  name: string;
  nameC: string;
  sub: string;
  subC: string;
  tagBg: string;
  tagC: string;
  tag: string;
  from: string;
  to: string;
  cityC: string;
  meta: string;
  metaC: string;
  priceBg: string;
  priceC: string;
  price: string;
  when: string;
  whenC: string;
};

export const RIDES: RideCardData[] = [
  {
    card: "#2F6C4F",
    av: "#14392A",
    avText: "#9EC5A2",
    initials: "JM",
    name: "James Mwangi",
    nameC: "#DDF3B2",
    sub: "4.9 · 128 trips",
    subC: "#9EC5A2",
    tagBg: "#14392A",
    tagC: "#9EC5A2",
    tag: "Premium",
    from: "Nanyuki",
    to: "Nairobi CBD",
    cityC: "#e5ffc3",
    meta: "↓ 3h 20m · 4 seats left",
    metaC: "#9EC5A2",
    priceBg: "#FAF8F4",
    priceC: "#0E0E0E",
    price: "KES 3,000",
    when: "Today · 6:00 AM",
    whenC: "#9EC5A2",
  },
  {
    card: "#D4B896",
    av: "#0E0E0E",
    avText: "#D4B896",
    initials: "AO",
    name: "Aisha Odhiambo",
    nameC: "#0E0E0E",
    sub: "4.8 · 91 trips",
    subC: "#5C4E3B",
    tagBg: "#0E0E0E",
    tagC: "#D4B896",
    tag: "Common",
    from: "Nakuru",
    to: "Nairobi",
    cityC: "#0E0E0E",
    meta: "↓ 2h 40m · 2 seats left",
    metaC: "#5C4E3B",
    priceBg: "#0E0E0E",
    priceC: "#FAF8F4",
    price: "KES 1,500",
    when: "Today · 2:15 PM",
    whenC: "#5C4E3B",
  },
  {
    card: "#e5ffc3",
    av: "#14392A",
    avText: "#e5ffc3",
    initials: "BK",
    name: "Brian Kiptoo",
    nameC: "#14392A",
    sub: "4.7 · 54 trips",
    subC: "#4B6330",
    tagBg: "#14392A",
    tagC: "#e5ffc3",
    tag: "Budget",
    from: "Naivasha",
    to: "Nairobi",
    cityC: "#14392A",
    meta: "↓ 1h 30m · 3 seats left",
    metaC: "#4B6330",
    priceBg: "#14392A",
    priceC: "#e5ffc3",
    price: "KES 1,000",
    when: "Tomorrow · 7:30 AM",
    whenC: "#4B6330",
  },
  {
    card: "#9EC5A2",
    av: "#0E0E0E",
    avText: "#9EC5A2",
    initials: "WN",
    name: "Wanjiku Njeri",
    nameC: "#0E0E0E",
    sub: "5.0 · 203 trips",
    subC: "#2F6C4F",
    tagBg: "#2F6C4F",
    tagC: "#FAF8F4",
    tag: "Premium",
    from: "Eldoret",
    to: "Nairobi",
    cityC: "#0E0E0E",
    meta: "↓ 5h 10m · 1 seat left",
    metaC: "#2F6C4F",
    priceBg: "#0E0E0E",
    priceC: "#FAF8F4",
    price: "KES 3,000",
    when: "Fri · 5:45 AM",
    whenC: "#2F6C4F",
  },
];

export type AlertData = {
  avBg: string;
  avC: string;
  initials: string;
  name: string;
  handle: string;
  time: string;
  chip: "traffic" | "accident" | "weather";
  chipLabel: string;
  loc: string;
  body: string;
  comments: number;
  hearts: number;
  views: number;
};

export const ALERTS: AlertData[] = [
  {
    avBg: "#14392A",
    avC: "#e5ffc3",
    initials: "JM",
    name: "James Mwangi",
    handle: "@jmwangi",
    time: "· 32m",
    chip: "traffic",
    chipLabel: "Traffic",
    loc: "Uhuru Highway, Nairobi",
    body: "Heavy traffic from Globe Roundabout to Nyayo Stadium — a stalled matatu is blocking the left lane. Expect 30–45 minutes. Haile Selassie is moving.",
    comments: 8,
    hearts: 42,
    views: 374,
  },
  {
    avBg: "#C0533F",
    avC: "#FAF8F4",
    initials: "AO",
    name: "Aisha Odhiambo",
    handle: "@aisha_o",
    time: "· 1h",
    chip: "accident",
    chipLabel: "Accident",
    loc: "Thika Road, Safari Park",
    body: "Two-vehicle collision near Safari Park Hotel. One lane blocked inbound to Nairobi, emergency services on site. Use the Outer Ring detour.",
    comments: 12,
    hearts: 38,
    views: 512,
  },
  {
    avBg: "#2F6C4F",
    avC: "#e5ffc3",
    initials: "BK",
    name: "Brian Kiptoo",
    handle: "@bkiptoo",
    time: "· 2h",
    chip: "weather",
    chipLabel: "Weather",
    loc: "Nakuru–Eldoret Highway",
    body: "Dense fog past Salgaa, visibility under 50 metres. Trucks crawling on the climbing lane. Drive with hazards, allow an extra hour.",
    comments: 21,
    hearts: 67,
    views: 891,
  },
];

export type StatData = {
  bg: string;
  numC: string;
  labelC: string;
  value: number;
  dec: number;
  prefix?: string;
  suffix: string;
  label: string;
};

export const STATS: StatData[] = [
  {
    bg: "#FAF8F4",
    numC: "#14392A",
    labelC: "#5A6357",
    value: 24800,
    dec: 0,
    suffix: "+",
    label: "riders on Kipita",
  },
  {
    bg: "#D4B896",
    numC: "#2E2416",
    labelC: "#5C4E3B",
    value: 6300,
    dec: 0,
    suffix: "+",
    label: "verified drivers",
  },
  {
    bg: "#9EC5A2",
    numC: "#14392A",
    labelC: "#2F4A38",
    value: 42,
    dec: 0,
    suffix: "",
    label: "towns connected",
  },
  {
    bg: "#0E0E0E",
    numC: "#FAF8F4",
    labelC: "#8E918B",
    value: 18.4,
    dec: 1,
    prefix: "KES",
    suffix: "M",
    label: "saved on fuel by sharing",
  },
];
