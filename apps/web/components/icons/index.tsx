import { createIcon, SOLID } from "./createIcon";

export type { IconProps, IconWeight, KipitaIcon } from "./createIcon";

const HOUSE = "M3.4 10.3 12 3.1l8.6 7.2v8.5a1.9 1.9 0 0 1-1.9 1.9H5.3a1.9 1.9 0 0 1-1.9-1.9Z";
const BELL_BODY =
  "M18.2 9.4a6.2 6.2 0 0 0-12.4 0c0 4.7-1.6 6.1-2.3 6.7a.85.85 0 0 0 .55 1.5h15.9a.85.85 0 0 0 .55-1.5c-.7-.6-2.3-2-2.3-6.7Z";
const BELL_CLAPPER = "M14.6 20.3a3 3 0 0 1-5.2 0";
const BUBBLE =
  "M20.6 11.7c0 4.2-3.85 7.6-8.6 7.6a9.9 9.9 0 0 1-2.94-.44L4.1 20.4l1.36-3.7A7.2 7.2 0 0 1 3.4 11.7c0-4.2 3.85-7.6 8.6-7.6s8.6 3.4 8.6 7.6Z";
const HEART =
  "M12 20.8c-.35 0-.69-.13-.95-.37l-6.9-6.44C2.2 12.05 2.2 8.7 4.15 6.85a5.3 5.3 0 0 1 7.35 0l.5.48.5-.48a5.3 5.3 0 0 1 7.35 0c1.95 1.85 1.95 5.2 0 7.14l-6.9 6.44c-.26.24-.6.37-.95.37Z";
const BOOKMARK =
  "M18.4 20.8 12 16.5l-6.4 4.3V5.6A1.8 1.8 0 0 1 7.4 3.8h9.2a1.8 1.8 0 0 1 1.8 1.8Z";
const STAR =
  "m12 3.2 2.78 5.63 6.22.9-4.5 4.39 1.06 6.19L12 17.38l-5.56 2.93 1.06-6.19-4.5-4.39 6.22-.9Z";
const PIN =
  "M19.5 10.4c0 5.1-5.7 10-7.1 11.1a.68.68 0 0 1-.8 0c-1.4-1.1-7.1-6-7.1-11.1a7.5 7.5 0 0 1 15 0Z";
const SEAL =
  "M12 2.4 14.3 4.6l3.2-.35.6 3.15 2.9 1.4-1.5 2.85 1.5 2.85-2.9 1.4-.6 3.15-3.2-.35L12 21.6l-2.3-2.2-3.2.35-.6-3.15-2.9-1.4 1.5-2.85-1.5-2.85 2.9-1.4.6-3.15 3.2.35Z";
const WARN =
  "M12 3.4a1.4 1.4 0 0 1 1.22.71l8.1 14.1A1.4 1.4 0 0 1 20.1 20.4H3.9a1.4 1.4 0 0 1-1.22-2.19l8.1-14.1A1.4 1.4 0 0 1 12 3.4Z";
const BOLT = "M13.2 2.6 4.4 13.2h5.8l-.4 8.2 9-10.6h-6Z";
const SPARK =
  "M12 3.2c0 5.6 2.6 8.2 8.2 8.2-5.6 0-8.2 2.6-8.2 8.2 0-5.6-2.6-8.2-8.2-8.2 5.6 0 8.2-2.6 8.2-8.2Z";
const SHIELD = "M12 21.3c1.4-.6 7.3-3.6 7.3-9.3V6.2L12 3.1 4.7 6.2V12c0 5.7 5.9 8.7 7.3 9.3Z";
const PLANE =
  "M21.4 3.4 2.8 9.9a.65.65 0 0 0-.06 1.2l7.3 3.44a.9.9 0 0 1 .43.43l3.44 7.3a.65.65 0 0 0 1.2-.06Z";
const FLAG = "M5 4.8h11.6a.8.8 0 0 1 .64 1.28L15 9.2l2.24 3.12a.8.8 0 0 1-.64 1.28H5Z";
const TICKET =
  "M3.4 8.4V6.6a1.8 1.8 0 0 1 1.8-1.8h13.6a1.8 1.8 0 0 1 1.8 1.8v1.8a3.6 3.6 0 0 0 0 7.2v1.8a1.8 1.8 0 0 1-1.8 1.8H5.2a1.8 1.8 0 0 1-1.8-1.8v-1.8a3.6 3.6 0 0 0 0-7.2Z";
const COMPASS_NEEDLE = "M15.6 8.4 13.4 13.4 8.4 15.6 10.6 10.6Z";
const MEGAPHONE =
  "M3.4 10.2v3.6a1.6 1.6 0 0 0 1.6 1.6h2.2l8.4 4.6a.9.9 0 0 0 1.4-.78V4.78a.9.9 0 0 0-1.4-.78L7.2 8.6H5a1.6 1.6 0 0 0-1.6 1.6Z";
const THUMB =
  "M7.4 10.4 11.6 2.6a2.6 2.6 0 0 1 2.6 2.6v3.6h4.8a2 2 0 0 1 1.95 2.44l-1.4 6.4a2 2 0 0 1-1.95 1.56H7.4Z";
const CLOUD =
  "M17.5 16.4H7a4.4 4.4 0 0 1-.55-8.77 5.7 5.7 0 0 1 11.05 1.37 3.7 3.7 0 0 1 0 7.4Z";
const LOCK_BODY =
  "M4.8 10.6h14.4a1.3 1.3 0 0 1 1.3 1.3v7.2a1.3 1.3 0 0 1-1.3 1.3H4.8a1.3 1.3 0 0 1-1.3-1.3v-7.2a1.3 1.3 0 0 1 1.3-1.3Z";
const GIFT_BOW_L = "M12 7.8S10.6 3 8.2 3a2.4 2.4 0 0 0 0 4.8Z";
const GIFT_BOW_R = "M12 7.8S13.4 3 15.8 3a2.4 2.4 0 0 1 0 4.8Z";
const MENU_BARS =
  "M142.7-211.04q-21.04 0-34.8-14.2-13.75-14.2-13.75-34.73 0-20.54 13.75-34.21 13.76-13.67 34.8-13.67h675.27q20.39 0 34.32 13.91 13.94 13.91 13.94 34.45 0 20.53-13.94 34.49-13.93 13.96-34.32 13.96H142.7Zm0-220.84q-21.04 0-34.8-14.2-13.75-14.2-13.75-34.54 0-20.35 13.75-34.02 13.76-13.68 34.8-13.68h675.27q20.39 0 34.32 13.91 13.94 13.92 13.94 34.27 0 20.34-13.94 34.3-13.93 13.96-34.32 13.96H142.7Zm0-221.03q-21.04 0-34.8-13.92-13.75-13.91-13.75-34.45 0-20.53 13.75-34.49 13.76-13.96 34.8-13.96h675.27q20.39 0 34.32 14.2 13.94 14.2 13.94 34.73 0 20.54-13.94 34.21-13.93 13.68-34.32 13.68H142.7Z";
const QUESTION_CIRCLE =
  "M10 .5c5.247 0 9.5 4.253 9.5 9.5s-4.253 9.5-9.5 9.5S.5 15.247.5 10 4.753.5 10 .5zm0 2c-4.142 0-7.5 3.358-7.5 7.5 0 4.142 3.358 7.5 7.5 7.5 4.142 0 7.5-3.358 7.5-7.5 0-4.142-3.358-7.5-7.5-7.5zM10 13c.69 0 1.25.56 1.25 1.25S10.69 15.5 10 15.5s-1.25-.56-1.25-1.25S9.31 13 10 13zm0-8.25c2.14 0 3.5 1.79 3.5 3.6 0 1.572-1.045 2.704-2.512 3.04-.068.486-.484.86-.989.86-.552 0-.999-.448-.999-1 0-1.011.805-1.644 1.527-1.805.674-.15.973-.557.973-1.095 0-.89-.64-1.6-1.5-1.6-.87 0-1.5.681-1.5 1.6 0 .552-.448 1-1 1s-1-.448-1-1c0-1.86 1.369-3.6 3.5-3.6z";

const dot = (cx: number, cy: number, r = 1.1) => (
  <circle cx={cx} cy={cy} r={r} {...SOLID} />
);

export const House = createIcon("House", (f) =>
  f ? <path d={HOUSE} {...SOLID} /> : <path d={HOUSE} />,
);

export const MagnifyingGlass = createIcon("MagnifyingGlass", () => (
  <>
    <circle cx="10.8" cy="10.8" r="6.8" />
    <path d="m15.8 15.8 4.6 4.6" />
  </>
));

export const Bell = createIcon("Bell", (f) => (
  <>
    <path d={BELL_BODY} {...(f ? SOLID : {})} />
    <path d={BELL_CLAPPER} {...(f ? SOLID : {})} />
  </>
));

export const BellRinging = createIcon("BellRinging", (f) => (
  <>
    <path d={BELL_BODY} {...(f ? SOLID : {})} />
    <path d={BELL_CLAPPER} {...(f ? SOLID : {})} />
    <path d="M2.7 7.4A6.6 6.6 0 0 1 5.8 2.5" />
    <path d="M21.3 7.4a6.6 6.6 0 0 0-3.1-4.9" />
  </>
));

export const BellSlash = createIcon("BellSlash", () => (
  <>
    <path d={BELL_BODY} />
    <path d={BELL_CLAPPER} />
    <path d="m3.6 3.6 16.8 16.8" />
  </>
));

export const ChatCircle = createIcon("ChatCircle", (f) =>
  f ? <path d={BUBBLE} {...SOLID} /> : <path d={BUBBLE} />,
);

export const Heart = createIcon("Heart", (f) =>
  f ? <path d={HEART} {...SOLID} /> : <path d={HEART} />,
);

export const BookmarkSimple = createIcon("BookmarkSimple", (f) =>
  f ? <path d={BOOKMARK} {...SOLID} /> : <path d={BOOKMARK} />,
);

export const Repost = createIcon("Repost", () => (
  <>
    <path d="M7.4 5.2h7.3a3.3 3.3 0 0 1 3.3 3.3v9.3" />
    <path d="m14.9 14.7 3.1 3.1 3.1-3.1" />
    <path d="M16.6 18.8H9.3A3.3 3.3 0 0 1 6 15.5V6.2" />
    <path d="M9.1 9.3 6 6.2 2.9 9.3" />
  </>
));

export const PaperPlaneTilt = createIcon("PaperPlaneTilt", (f) => (
  <>
    <path d={PLANE} {...(f ? SOLID : {})} />
    {!f && <path d="M21.4 3.4 10.03 14.77" />}
  </>
));

export const User = createIcon("User", (f) => (
  <>
    <circle cx="12" cy="8" r="3.9" {...(f ? SOLID : {})} />
    <path d="M4.6 20.2a7.6 7.6 0 0 1 14.8 0" {...(f ? SOLID : {})} />
  </>
));

export const UserCircle = createIcon("UserCircle", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="10" r="3.2" />
    <path d="M5.9 19.4a6.7 6.7 0 0 1 12.2 0" />
  </>
));

export const Users = createIcon("Users", () => (
  <>
    <circle cx="9.4" cy="8.4" r="3.6" />
    <path d="M2.8 19.6a6.8 6.8 0 0 1 13.2 0" />
    <path d="M16.4 5.2a3.6 3.6 0 0 1 0 6.4" />
    <path d="M18.6 19.6a6.6 6.6 0 0 0-3-4.7" />
  </>
));

export const UserPlus = createIcon("UserPlus", () => (
  <>
    <circle cx="9.6" cy="8.2" r="3.7" />
    <path d="M2.8 19.8a6.9 6.9 0 0 1 13.4 0" />
    <path d="M18.8 8.4v5.2M21.4 11h-5.2" />
  </>
));

export const UserFocus = createIcon("UserFocus", () => (
  <>
    <path d="M3.2 8.2V5.4a2.2 2.2 0 0 1 2.2-2.2h2.8" />
    <path d="M15.8 3.2h2.8a2.2 2.2 0 0 1 2.2 2.2v2.8" />
    <path d="M20.8 15.8v2.8a2.2 2.2 0 0 1-2.2 2.2h-2.8" />
    <path d="M8.2 20.8H5.4a2.2 2.2 0 0 1-2.2-2.2v-2.8" />
    <circle cx="12" cy="10.4" r="2.8" />
    <path d="M7.4 17.8a5.2 5.2 0 0 1 9.2 0" />
  </>
));

export const Star = createIcon("Star", (f) =>
  f ? <path d={STAR} {...SOLID} /> : <path d={STAR} />,
);

export const MapPin = createIcon("MapPin", (f) => (
  <>
    <path d={PIN} {...(f ? SOLID : {})} />
    {!f && <circle cx="12" cy="10.4" r="2.8" />}
  </>
));

export const MapTrifold = createIcon("MapTrifold", () => (
  <>
    <path d="M8.9 5.4 3.5 3.5a.9.9 0 0 0-1.2.85v12.4a.9.9 0 0 0 .6.85l6 2.1 6.2-2.1 5.4 1.9a.9.9 0 0 0 1.2-.85V6.3a.9.9 0 0 0-.6-.85l-6-2.1Z" />
    <path d="M8.9 5.4v14.3M15.1 3.35v14.3" />
  </>
));

export const NavigationArrow = createIcon("NavigationArrow", (f) => (
  <path
    d="M12 3 19.6 20.2a.8.8 0 0 1-1.06 1.02L12 18.4l-6.54 2.82A.8.8 0 0 1 4.4 20.2Z"
    {...(f ? SOLID : {})}
  />
));

export const Compass = createIcon("Compass", (f) => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d={COMPASS_NEEDLE} {...(f ? SOLID : {})} />
  </>
));

export const Path = createIcon("Path", () => (
  <>
    <circle cx="6.2" cy="5.6" r="2.6" />
    <circle cx="17.8" cy="18.4" r="2.6" />
    <path d="M8.8 5.6h5.8a3.4 3.4 0 0 1 0 6.8H9.4a3.4 3.4 0 0 0 0 6.8h5.8" />
  </>
));

export const Car = createIcon("Car", () => (
  <>
    <path d="M5.2 11.4 7 7.4A2.4 2.4 0 0 1 9.2 6h5.6a2.4 2.4 0 0 1 2.2 1.4l1.8 4" />
    <path d="M3.8 11.4h16.4a1.7 1.7 0 0 1 1.7 1.7v3.3a1.2 1.2 0 0 1-1.2 1.2H3.3a1.2 1.2 0 0 1-1.2-1.2v-3.3a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="M6.6 17.6v.8a1.4 1.4 0 0 1-2.8 0v-.8M20.2 17.6v.8a1.4 1.4 0 0 1-2.8 0v-.8" />
    <path d="M5.1 14h1.7M17.2 14h1.7" />
  </>
));

export const CarSuv = createIcon("CarSuv", () => (
  <>
    <path d="M4.6 11.2 6.1 7.5A2.5 2.5 0 0 1 8.4 6h7.2a2.5 2.5 0 0 1 2.3 1.5l1.5 3.7" />
    <path d="M3.4 11.2h17.2a1.7 1.7 0 0 1 1.7 1.7v3.4a1.2 1.2 0 0 1-1.2 1.2H2.9a1.2 1.2 0 0 1-1.2-1.2v-3.4a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="M6.6 17.5v.9a1.4 1.4 0 0 1-2.8 0v-.9M20.2 17.5v.9a1.4 1.4 0 0 1-2.8 0v-.9" />
    <path d="M12 6v5.2" />
  </>
));

export const CarVan = createIcon("CarVan", () => (
  <>
    <path d="M2.6 16.6V7.8a1.8 1.8 0 0 1 1.8-1.8h9.9a1.8 1.8 0 0 1 1.5.8l3.1 4.6a2 2 0 0 1 .35 1.13v4.07" />
    <path d="M2.6 16.6h18.1a.9.9 0 0 0 .9-.9v-2.6a1.5 1.5 0 0 0-1.5-1.5H15.4V6.4" />
    <path d="M7.4 17.4v.9a1.4 1.4 0 0 1-2.8 0v-.9M19.4 17.4v.9a1.4 1.4 0 0 1-2.8 0v-.9" />
    <path d="M6.2 9.2h5.4" />
  </>
));

export const CarMinibus = createIcon("CarMinibus", () => (
  <>
    <path d="M3.2 5.4h17.6a1.4 1.4 0 0 1 1.4 1.4v9.4a1.2 1.2 0 0 1-1.2 1.2H3a1.2 1.2 0 0 1-1.2-1.2V6.8a1.4 1.4 0 0 1 1.4-1.4Z" />
    <path d="M1.8 9.6h20.4" />
    <path d="M6.4 5.6v4M12 5.6v4M17.6 5.6v4" />
    <path d="M6.6 17.4v.9a1.4 1.4 0 0 1-2.8 0v-.9M20.2 17.4v.9a1.4 1.4 0 0 1-2.8 0v-.9" />
  </>
));

export const CarProfile = createIcon("CarProfile", () => (
  <>
    <path d="M5.2 11.4 7 7.4A2.4 2.4 0 0 1 9.2 6h5.6a2.4 2.4 0 0 1 2.2 1.4l1.8 4" />
    <path d="M3.8 11.4h16.4a1.7 1.7 0 0 1 1.7 1.7v3.3a1.2 1.2 0 0 1-1.2 1.2H3.3a1.2 1.2 0 0 1-1.2-1.2v-3.3a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="M6.6 17.6v.8a1.4 1.4 0 0 1-2.8 0v-.8M20.2 17.6v.8a1.4 1.4 0 0 1-2.8 0v-.8" />
    <path d="M12 6v5.4" />
  </>
));

export const Ticket = createIcon("Ticket", (f) => (
  <>
    <path d={TICKET} {...(f ? SOLID : {})} />
    {!f && <path d="M14.4 7.2v1.6M14.4 11.2v1.6M14.4 15.2v1.6" />}
  </>
));

export const Warning = createIcon("Warning", (f) => (
  <>
    <path d={WARN} {...(f ? SOLID : {})} />
    <path d="M12 9.4v4.4" stroke={f ? "var(--icon-knockout, #fff)" : undefined} />
    {dot(12, 17.1)}
  </>
));

export const Lightning = createIcon("Lightning", (f) =>
  f ? <path d={BOLT} {...SOLID} /> : <path d={BOLT} />,
);

export const Sparkle = createIcon("Sparkle", (f) =>
  f ? <path d={SPARK} {...SOLID} /> : <path d={SPARK} />,
);

export const Shield = createIcon("Shield", (f) =>
  f ? <path d={SHIELD} {...SOLID} /> : <path d={SHIELD} />,
);

export const ShieldCheck = createIcon("ShieldCheck", () => (
  <>
    <path d={SHIELD} />
    <path d="m8.9 11.9 2.2 2.2 4.1-4.4" />
  </>
));

export const SealCheck = createIcon("SealCheck", (f) => (
  <>
    <path d={SEAL} {...(f ? SOLID : {})} />
    <path d="m8.4 12.2 2.5 2.5 4.7-5.2" stroke={f ? "var(--icon-knockout, #fff)" : undefined} />
  </>
));

export const VerifiedBadge = createIcon("VerifiedBadge", () => (
  <>
    <path
      d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81C14.67 2.63 13.43 1.75 12 1.75s-2.67.88-3.34 2.19c-1.39-.46-2.9-.2-3.91.81s-1.27 2.52-.81 3.91C2.63 9.33 1.75 10.57 1.75 12s.88 2.67 2.19 3.34c-.46 1.39-.2 2.9.81 3.91s2.52 1.27 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.67-.88 3.34-2.19c1.39.46 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34Z"
      {...SOLID}
    />
    <path
      d="m8.6 12.3 2.4 2.4 4.8-5.1"
      stroke="var(--badge-knockout, #fff)"
      strokeWidth="2.1"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </>
));

export const SealPercent = createIcon("SealPercent", () => (
  <>
    <path d={SEAL} />
    <path d="m9.4 14.6 5.2-5.2" />
    {dot(9.6, 9.7, 1.15)}
    {dot(14.4, 14.3, 1.15)}
  </>
));

export const Flag = createIcon("Flag", (f) => (
  <>
    <path d="M5 21.2V4.4" />
    <path d={FLAG} {...(f ? SOLID : {})} />
  </>
));

export const Megaphone = createIcon("Megaphone", (f) => (
  <>
    <path d={MEGAPHONE} {...(f ? SOLID : {})} />
    {!f && <path d="M7.2 8.6v6.8" />}
    <path d="M19.6 9.5a3.2 3.2 0 0 1 0 5" />
  </>
));

export const ThumbsUp = createIcon("ThumbsUp", (f) => (
  <>
    <path d={THUMB} {...(f ? SOLID : {})} />
    <path
      d="M7.4 10.4H4.2a1.4 1.4 0 0 0-1.4 1.4v7.4a1.4 1.4 0 0 0 1.4 1.4h3.2Z"
      {...(f ? SOLID : {})}
    />
  </>
));

export const CloudRain = createIcon("CloudRain", () => (
  <>
    <path d={CLOUD} />
    <path d="M8.6 18.8v2M12 18.8v2.4M15.4 18.8v2" />
  </>
));

export const Cloud = createIcon("Cloud", (f) => (
  <path d={CLOUD} {...(f ? SOLID : {})} />
));

export const CloudSun = createIcon("CloudSun", () => (
  <>
    <circle cx="8.4" cy="7.4" r="3.1" />
    <path d="M8.4 1.9v1.4M8.4 11.5v1.4M3.5 7.4H2.1M14.7 7.4h-1.4M4.93 3.93 3.95 2.95M12.85 11.85l-.98-.98M4.93 10.87l-.98.98M12.85 2.95l-.98.98" />
    <path d="M18.4 19.6H9.6a4 4 0 0 1-.5-7.97 5.2 5.2 0 0 1 10.05 1.25 3.4 3.4 0 0 1-.75 6.72Z" />
  </>
));

export const CloudFog = createIcon("CloudFog", () => (
  <>
    <path d="M17.2 14.6H7a4.2 4.2 0 0 1-.52-8.37 5.45 5.45 0 0 1 10.55 1.31 3.53 3.53 0 0 1 .17 7.06Z" />
    <path d="M5.2 18.2h13.6M7.6 21.2h9.2" />
  </>
));

export const CloudLightning = createIcon("CloudLightning", () => (
  <>
    <path d={CLOUD} />
    <path d="M13 17.4 10 21.4h3l-.5 2.2" />
  </>
));

export const Sun = createIcon("Sun", (f) => (
  <>
    <circle cx="12" cy="12" r="4.4" {...(f ? SOLID : {})} />
    <path d="M12 2.6v2.4M12 19v2.4M4.35 4.35l1.7 1.7M17.95 17.95l1.7 1.7M2.6 12H5M19 12h2.4M4.35 19.65l1.7-1.7M17.95 6.05l1.7-1.7" />
  </>
));

export const Moon = createIcon("Moon", (f) => (
  <path
    d="M20.4 14.6A9 9 0 0 1 9.4 3.6a9 9 0 1 0 11 11Z"
    {...(f ? SOLID : {})}
  />
));

export const Lock = createIcon("Lock", (f) => (
  <>
    <path d="M7.6 10.6V7.8a4.4 4.4 0 0 1 8.8 0v2.8" />
    <path d={LOCK_BODY} {...(f ? SOLID : {})} />
  </>
));

export const Eye = createIcon("Eye", () => (
  <>
    <path d="M2.2 12S5.8 5.4 12 5.4 21.8 12 21.8 12 18.2 18.6 12 18.6 2.2 12 2.2 12Z" />
    <circle cx="12" cy="12" r="3.2" />
  </>
));

export const EyeSlash = createIcon("EyeSlash", () => (
  <>
    <path d="M2.2 12S5.8 5.4 12 5.4 21.8 12 21.8 12 18.2 18.6 12 18.6 2.2 12 2.2 12Z" />
    <circle cx="12" cy="12" r="3.2" />
    <path d="m3.6 3.6 16.8 16.8" />
  </>
));

export const Envelope = createIcon("Envelope", () => (
  <>
    <path d="M3.6 5.6h16.8a1.7 1.7 0 0 1 1.7 1.7v9.4a1.7 1.7 0 0 1-1.7 1.7H3.6a1.7 1.7 0 0 1-1.7-1.7V7.3a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="m2.4 7.5 8.66 6.06a1.6 1.6 0 0 0 1.88 0L21.6 7.5" />
  </>
));

export const EnvelopeSimple = createIcon("EnvelopeSimple", () => (
  <>
    <path d="M3.6 5.6h16.8a1.7 1.7 0 0 1 1.7 1.7v9.4a1.7 1.7 0 0 1-1.7 1.7H3.6a1.7 1.7 0 0 1-1.7-1.7V7.3a1.7 1.7 0 0 1 1.7-1.7Z" />
    <path d="m2.4 7.5 8.66 6.06a1.6 1.6 0 0 0 1.88 0L21.6 7.5" />
  </>
));

export const Phone = createIcon("Phone", () => (
  <path d="M8.3 4.2 5.6 4.9a1.9 1.9 0 0 0-1.4 2.05c.5 4.3 2.5 8.1 5.6 10.8 2.6 2.3 5.6 3.5 8.6 3.6a1.9 1.9 0 0 0 1.9-1.6l.4-2.7a1.2 1.2 0 0 0-.75-1.3l-3.3-1.3a1.2 1.2 0 0 0-1.35.35l-1 1.2a13.6 13.6 0 0 1-5.1-5.1l1.2-1a1.2 1.2 0 0 0 .35-1.35L9.5 4.9a1.2 1.2 0 0 0-1.2-.7Z" />
));

export const DeviceMobile = createIcon("DeviceMobile", () => (
  <>
    <path d="M7 2.6h10a1.8 1.8 0 0 1 1.8 1.8v15.2a1.8 1.8 0 0 1-1.8 1.8H7a1.8 1.8 0 0 1-1.8-1.8V4.4A1.8 1.8 0 0 1 7 2.6Z" />
    <path d="M10.4 18.4h3.2" />
  </>
));

export const Camera = createIcon("Camera", () => (
  <>
    <path d="M3.6 8.8h2.8l1.5-2.4a1.6 1.6 0 0 1 1.36-.76h5.48a1.6 1.6 0 0 1 1.36.76l1.5 2.4h2.8a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H3.6a1.6 1.6 0 0 1-1.6-1.6v-8a1.6 1.6 0 0 1 1.6-1.6Z" />
    <circle cx="12" cy="13.6" r="3.4" />
  </>
));

export const ImageSquare = createIcon("ImageSquare", () => (
  <>
    <path d="M4.4 3.8h15.2a1.8 1.8 0 0 1 1.8 1.8v12.8a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V5.6a1.8 1.8 0 0 1 1.8-1.8Z" />
    <circle cx="8.8" cy="9" r="1.8" />
    <path d="m2.8 16.8 4.6-4.4a1.8 1.8 0 0 1 2.5 0l4.4 4.2" />
    <path d="m13.6 14.2 2-1.9a1.8 1.8 0 0 1 2.5 0l3.3 3.1" />
  </>
));

export const Calendar = createIcon("Calendar", () => (
  <>
    <path d="M4.6 5.6h14.8a1.8 1.8 0 0 1 1.8 1.8v11.8a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V7.4a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M2.8 10h18.4M8 3.4v4M16 3.4v4" />
    {dot(12, 14.6)}
  </>
));

export const CalendarBlank = createIcon("CalendarBlank", () => (
  <>
    <path d="M4.6 5.6h14.8a1.8 1.8 0 0 1 1.8 1.8v11.8a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V7.4a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M2.8 10h18.4M8 3.4v4M16 3.4v4" />
  </>
));

export const CalendarDots = createIcon("CalendarDots", () => (
  <>
    <path d="M4.6 5.6h14.8a1.8 1.8 0 0 1 1.8 1.8v11.8a1.8 1.8 0 0 1-1.8 1.8H4.6a1.8 1.8 0 0 1-1.8-1.8V7.4a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M2.8 10h18.4M8 3.4v4M16 3.4v4" />
    {dot(8, 14)}
    {dot(12, 14)}
    {dot(16, 14)}
  </>
));

export const Clock = createIcon("Clock", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M12 6.8V12l3.6 2.2" />
  </>
));

export const CalendarSolid = createIcon("CalendarSolid", () => (
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M8 2a1.1 1.1 0 0 1 1.1 1.1V4h5.8v-.9a1.1 1.1 0 0 1 2.2 0V4h1.3A2.6 2.6 0 0 1 21 6.6v12.8a2.6 2.6 0 0 1-2.6 2.6H5.6A2.6 2.6 0 0 1 3 19.4V6.6A2.6 2.6 0 0 1 5.6 4h1.3v-.9A1.1 1.1 0 0 1 8 2Zm10.8 8.4H5.2v9a.4.4 0 0 0 .4.4h12.8a.4.4 0 0 0 .4-.4v-9Zm-9.9 2.3a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Zm5.5 0a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6Z"
    {...SOLID}
  />
));

export const ClockSolid = createIcon("ClockSolid", () => (
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Zm1.1 4.9a1.1 1.1 0 1 0-2.2 0v5.2c0 .38.2.73.52.93l3.5 2.2a1.1 1.1 0 1 0 1.16-1.86l-2.98-1.87V7.1Z"
    {...SOLID}
  />
));

export const CarSolid = createIcon("CarSolid", () => (
  <path
    fillRule="evenodd"
    clipRule="evenodd"
    d="M8.3 4.4h7.4a3 3 0 0 1 2.76 1.83l1.6 3.79A2.1 2.1 0 0 1 22 12.1v3.3c0 .87-.53 1.62-1.3 1.93v.87a1.9 1.9 0 0 1-3.8 0v-.6H7.1v.6a1.9 1.9 0 0 1-3.8 0v-.87A2.1 2.1 0 0 1 2 15.4v-3.3c0-.92.6-1.71 1.44-1.98l1.6-3.79A3 3 0 0 1 8.3 4.4Zm0 2.2a.8.8 0 0 0-.74.49L6.13 10.5h11.74l-1.43-3.41a.8.8 0 0 0-.74-.49H8.3ZM6 12.4a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Zm12 0a1.3 1.3 0 1 0 0 2.6 1.3 1.3 0 0 0 0-2.6Z"
    {...SOLID}
  />
));

export const Circle = createIcon("Circle", (f) => (
  <circle cx="12" cy="12" r="9.2" {...(f ? SOLID : {})} />
));

export const CircleNotch = createIcon("CircleNotch", () => (
  <path d="M21.2 12a9.2 9.2 0 1 1-2.7-6.5" />
));

export const MenuBars = createIcon(
  "MenuBars",
  () => <path d={MENU_BARS} {...SOLID} />,
  { viewBox: "0 -960 960 960" },
);

export const Square = createIcon("Square", (f) => (
  <rect x="3.4" y="3.4" width="17.2" height="17.2" rx="2.6" {...(f ? SOLID : {})} />
));

export const CheckCircle = createIcon("CheckCircle", (f) => (
  <>
    <circle cx="12" cy="12" r="9.2" {...(f ? SOLID : {})} />
    <path d="m8.2 12.2 2.7 2.7 4.9-5.6" stroke={f ? "var(--icon-knockout, #fff)" : undefined} />
  </>
));

export const XCircle = createIcon("XCircle", (f) => (
  <>
    <circle cx="12" cy="12" r="9.2" {...(f ? SOLID : {})} />
    <path d="m9 9 6 6M15 9l-6 6" stroke={f ? "var(--icon-knockout, #fff)" : undefined} />
  </>
));

export const Info = createIcon("Info", (f) => (
  <>
    <circle cx="12" cy="12" r="9.2" {...(f ? SOLID : {})} />
    <path d="M12 11.2v5" stroke={f ? "var(--icon-knockout, #fff)" : undefined} />
    <circle cx="12" cy="7.9" r="1.1" fill={f ? "var(--icon-knockout, #fff)" : "currentColor"} stroke="none" />
  </>
));

export const Question = createIcon("Question", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M9.4 9.5a2.65 2.65 0 0 1 5.16.9c0 1.75-2.58 2.6-2.58 2.6" />
    {dot(12, 16.9)}
  </>
));

export const Prohibit = createIcon("Prohibit", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d="m5.5 5.5 13 13" />
  </>
));

export const SmileySad = createIcon("SmileySad", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <path d="M8.2 16.3a4.7 4.7 0 0 1 7.6 0" />
    {dot(9.2, 9.8, 1.15)}
    {dot(14.8, 9.8, 1.15)}
  </>
));

export const Check = createIcon("Check", () => <path d="m4.6 12.6 5 5 9.8-11.2" />);

export const Checks = createIcon("Checks", () => (
  <>
    <path d="m2.2 12.6 3.6 3.6 8.2-9.4" />
    <path d="m9.8 15.4 1.6 1.6 8.4-9.6" />
  </>
));

export const Plus = createIcon("Plus", () => <path d="M12 4.8v14.4M4.8 12h14.4" />);

export const Minus = createIcon("Minus", () => <path d="M4.8 12h14.4" />);

export const X = createIcon("X", () => <path d="M6.2 6.2 17.8 17.8M17.8 6.2 6.2 17.8" />);

export const List = createIcon("List", () => (
  <path d="M3.6 7h16.8M3.6 12h16.8M3.6 17h16.8" />
));

export const DotsThree = createIcon("DotsThree", () => (
  <>
    {dot(5.4, 12, 1.25)}
    {dot(12, 12, 1.25)}
    {dot(18.6, 12, 1.25)}
  </>
));

export const DotsThreeCircle = createIcon("DotsThreeCircle", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    {dot(7.6, 12)}
    {dot(12, 12)}
    {dot(16.4, 12)}
  </>
));

const FLUENT = { viewBox: "0 0 20 20" };
const FLUENT16 = { viewBox: "0 0 16 16" };

export const BarChart = createIcon(
  "BarChart",
  () => (
    <path
      d="M2.25 9.5c.414 0 .75.336.75.75v3c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-3c0-.414.336-.75.75-.75zm4-5c.414 0 .75.336.75.75v8c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-8c0-.414.336-.75.75-.75zm4 2.5c.414 0 .75.336.75.75v5.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75v-5.5c0-.414.336-.75.75-.75zm4-6c.414 0 .75.336.75.75v11.5c0 .414-.336.75-.75.75s-.75-.336-.75-.75V1.75c0-.414.336-.75.75-.75z"
      {...SOLID}
    />
  ),
  FLUENT16,
);

const HEART16 =
  "M8 13.87c-.23 0-.46-.09-.63-.25L2.77 9.33C1.47 8.03 1.47 5.8 2.77 4.57a3.53 3.53 0 0 1 4.9 0l.33.32.33-.32a3.53 3.53 0 0 1 4.9 0c1.3 1.23 1.3 3.46 0 4.76l-4.6 4.29c-.17.16-.4.25-.63.25Z";
const BOOKMARK16 =
  "M12.27 13.87 8 11l-4.27 2.87V3.73A1.2 1.2 0 0 1 4.93 2.53h6.14a1.2 1.2 0 0 1 1.2 1.2Z";

export const HeartSmall = createIcon(
  "HeartSmall",
  (f) => (f ? <path d={HEART16} {...SOLID} /> : <path d={HEART16} />),
  FLUENT16,
);

export const BookmarkSmall = createIcon(
  "BookmarkSmall",
  (f) => (f ? <path d={BOOKMARK16} {...SOLID} /> : <path d={BOOKMARK16} />),
  FLUENT16,
);

export const CheckSmall = createIcon(
  "CheckSmall",
  () => <path d="m3.07 8.4 3.33 3.33 6.53-7.46" />,
  FLUENT16,
);

export const ProhibitedSmall = createIcon(
  "ProhibitedSmall",
  () => (
    <>
      <circle cx="8" cy="8" r="6.13" />
      <path d="m3.67 3.67 8.66 8.66" />
    </>
  ),
  FLUENT16,
);

export const ShareSmall = createIcon(
  "ShareSmall",
  () => (
    <>
      <path d="M8 2.2v8.3" />
      <path d="M5.4 4.8 8 2.2l2.6 2.6" />
      <path d="M3.7 8.2v4.1a1.4 1.4 0 0 0 1.4 1.4h5.8a1.4 1.4 0 0 0 1.4-1.4V8.2" />
    </>
  ),
  FLUENT16,
);

export const Message = createIcon(
  "Message",
  () => (
    <path
      d="M8 .5c4.142 0 7.5 3.358 7.5 7.5 0 4.142-3.358 7.5-7.5 7.5-1.066 0-2.08-.226-2.999-.628-.746.165-1.505.354-2.16.526-1.347.351-2.591-.894-2.238-2.24.17-.654.358-1.415.523-2.163C.726 10.077.5 9.064.5 8 .5 3.858 3.858.5 8 .5zM8 2C4.686 2 2 4.686 2 8c0 .929.21 1.806.586 2.589.073.152.093.324.058.49-.183.848-.397 1.723-.59 2.46-.062.236.17.469.407.407.734-.192 1.608-.41 2.457-.591.124-.027.253-.022.373.013l.118.045.298.133C6.413 13.838 7.187 14 8 14c3.314 0 6-2.686 6-6s-2.686-6-6-6zM5 7c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1zm3 0c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1zm3 0c.552 0 1 .448 1 1s-.448 1-1 1-1-.448-1-1 .448-1 1-1z"
      {...SOLID}
    />
  ),
  FLUENT16,
);

const CARD_BODY =
  "M15.754 7.5c2.006 0 3.534 1.801 3.206 3.781l-.829 5C17.871 17.85 16.515 19 14.925 19H5.08c-1.59 0-2.947-1.15-3.207-2.719l-.828-5C.716 9.301 2.244 7.501 4.25 7.5h11.503z";
const CARD_MID = "M2.428 6.363C2.558 5.051 3.665 4 5.04 4h9.928c1.375 0 2.482 1.051 2.612 2.363";
const CARD_TOP = "M4.786 2.508C5.203 1.625 6.099 1 7.158 1h5.692c1.06 0 1.955.625 2.372 1.508";

export const CardStack = createIcon(
  "CardStack",
  (f) =>
    f ? (
      <path
        d="M15.754 7.5c2.006 0 3.534 1.801 3.206 3.781l-.829 5C17.871 17.85 16.515 19 14.925 19H5.08c-1.59 0-2.947-1.15-3.207-2.719l-.828-5C.716 9.301 2.244 7.501 4.25 7.5h11.503zM14.968 4c1.375 0 2.482 1.051 2.612 2.363C17.02 6.13 16.403 6 15.753 6H4.25c-.649 0-1.263.129-1.82.36C2.56 5.05 3.665 4 5.04 4h9.928zM12.85 1c1.06 0 1.955.625 2.372 1.508-.084-.005-.168-.008-.254-.008H5.04c-.086 0-.17.003-.254.008C5.203 1.625 6.099 1 7.158 1h5.692z"
        {...SOLID}
      />
    ) : (
      <>
        <path d={CARD_BODY} />
        <path d={CARD_MID} />
        <path d={CARD_TOP} />
      </>
    ),
  FLUENT,
);

const COMPASS_DIAL =
  "M12.861 5.525l-.189.055-4.16 1.58c-.737.279-1.317.86-1.597 1.595l-1.579 4.161c-.382 1.008.605 1.995 1.613 1.613l4.16-1.579c.737-.279 1.318-.86 1.598-1.596l1.578-4.161c.357-.945-.487-1.871-1.424-1.668z";

export const CompassRose = createIcon(
  "CompassRose",
  (f) =>
    f ? (
      <path
        d="M10 .5c5.247 0 9.5 4.253 9.5 9.5s-4.253 9.5-9.5 9.5S.5 15.247.5 10 4.753.5 10 .5zm3.05 4.97l-.189.055-4.16 1.58c-.737.279-1.317.86-1.597 1.595l-1.579 4.161c-.382 1.008.605 1.995 1.613 1.613l4.16-1.579c.737-.279 1.318-.86 1.598-1.596l1.578-4.161c.357-.945-.487-1.871-1.424-1.668zM10 8.5c.828 0 1.5.672 1.5 1.5s-.672 1.5-1.5 1.5-1.5-.672-1.5-1.5.672-1.5 1.5-1.5z"
        {...SOLID}
      />
    ) : (
      <>
        <circle cx="10" cy="10" r="8.85" />
        <path d={COMPASS_DIAL} />
      </>
    ),
  FLUENT,
);

const GRID_TL = "M4 1h2.412a3 3 0 0 1 3 3v2.413a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Z";
const GRID_TR =
  "M13.589 1H16a3 3 0 0 1 3 3v2.413a3 3 0 0 1-3 3h-2.411a3 3 0 0 1-3-3V4a3 3 0 0 1 3-3Z";
const GRID_BL =
  "M4 10.589h2.412a3 3 0 0 1 3 3v2.413a3 3 0 0 1-3 3H4a3 3 0 0 1-3-3v-2.413a3 3 0 0 1 3-3Z";
const GRID_BR =
  "M13.589 10.589H16a3 3 0 0 1 3 3v2.413a3 3 0 0 1-3 3h-2.411a3 3 0 0 1-3-3v-2.413a3 3 0 0 1 3-3Z";

export const ArrowOut = createIcon(
  "ArrowOut",
  () => (
    <path
      d="M5.24408 14.7559C5.56951 15.0814 6.09715 15.0814 6.42259 14.7559L13.3333 7.84518V14.1667C13.3333 14.6269 13.7064 15 14.1667 15C14.6269 15 15 14.6269 15 14.1667V5.83333C15 5.3731 14.6269 5 14.1667 5H5.83333C5.3731 5 5 5.3731 5 5.83333C5 6.29357 5.3731 6.66667 5.83333 6.66667H12.1548L5.24408 13.5774C4.91864 13.9028 4.91864 14.4305 5.24408 14.7559Z"
      fillRule="evenodd"
      clipRule="evenodd"
      {...SOLID}
    />
  ),
  FLUENT,
);

export const Grid = createIcon(
  "Grid",
  (f) => (
    <>
      <path d={GRID_TL} {...(f ? SOLID : {})} />
      <path d={GRID_TR} {...(f ? SOLID : {})} />
      <path d={GRID_BL} {...(f ? SOLID : {})} />
      <path d={GRID_BR} {...(f ? SOLID : {})} />
    </>
  ),
  FLUENT,
);

const CONE = "M12 3.2a1.4 1.4 0 0 1 1.33.96l4.3 13.04H6.37l4.3-13.04A1.4 1.4 0 0 1 12 3.2Z";
const CONE_BASE =
  "M4.2 17.2h15.6a1.5 1.5 0 0 1 1.5 1.5v.7a1.5 1.5 0 0 1-1.5 1.5H4.2a1.5 1.5 0 0 1-1.5-1.5v-.7a1.5 1.5 0 0 1 1.5-1.5Z";
const TRIP_PIN =
  "M20.9 14.8c0 3-3.3 5.9-4.05 6.5a.55.55 0 0 1-.7 0c-.75-.6-4.05-3.5-4.05-6.5a4.4 4.4 0 0 1 8.8 0Z";

export const TrafficCone = createIcon("TrafficCone", (f) => (
  <>
    <path d={CONE} {...(f ? SOLID : {})} />
    <path
      d="M9.85 9.9h4.3M8.6 13.6h6.8"
      stroke={f ? "var(--icon-knockout, #fff)" : undefined}
    />
    <path d={CONE_BASE} {...(f ? SOLID : {})} />
  </>
));

export const RouteTrip = createIcon("RouteTrip", (f) => (
  <>
    <circle cx="5.4" cy="5.4" r="2.5" {...(f ? SOLID : {})} />
    <path d="M5.4 8.4v3.6a3.2 3.2 0 0 0 3.2 3.2h3.5" />
    <path d={TRIP_PIN} {...(f ? SOLID : {})} />
    {f ? null : <circle cx="16.5" cy="14.8" r="1.6" />}
  </>
));

export const Crosshair = createIcon("Crosshair", () => (
  <>
    <circle cx="12" cy="12" r="8.4" />
    <path d="M12 1.8v4.4M12 17.8v4.4M1.8 12h4.4M17.8 12h4.4" />
    {dot(12, 12, 1.5)}
  </>
));

export const Tag = createIcon("Tag", () => (
  <>
    <path d="M3.6 10.6V4.8a1.2 1.2 0 0 1 1.2-1.2h5.8a1.2 1.2 0 0 1 .85.35l8.8 8.8a1.2 1.2 0 0 1 0 1.7l-5.75 5.75a1.2 1.2 0 0 1-1.7 0l-8.8-8.8a1.2 1.2 0 0 1-.4-.85Z" />
    {dot(7.8, 7.8, 1.35)}
  </>
));

export const CaretDown = createIcon("CaretDown", () => <path d="m6.4 9.2 5.6 5.6 5.6-5.6" />);
export const CaretLeft = createIcon("CaretLeft", () => <path d="m14.8 6.4-5.6 5.6 5.6 5.6" />);
export const CaretRight = createIcon("CaretRight", () => <path d="m9.2 6.4 5.6 5.6-5.6 5.6" />);

export const ArrowLeft = createIcon("ArrowLeft", () => (
  <>
    <path d="M19.2 12H4.8" />
    <path d="M11 5.8 4.8 12l6.2 6.2" />
  </>
));

export const ArrowRight = createIcon("ArrowRight", () => (
  <>
    <path d="M4.8 12h14.4" />
    <path d="M13 5.8 19.2 12 13 18.2" />
  </>
));

export const ArrowDown = createIcon("ArrowDown", () => (
  <>
    <path d="M12 4.8v14.4" />
    <path d="m5.8 13 6.2 6.2L18.2 13" />
  </>
));

export const ArrowUpRight = createIcon("ArrowUpRight", () => (
  <>
    <path d="M6.6 17.4 17.4 6.6" />
    <path d="M8.6 6.6h8.8v8.8" />
  </>
));

export const ArrowUUpLeft = createIcon("ArrowUUpLeft", () => (
  <>
    <path d="M9.2 14.4 4.4 9.6 9.2 4.8" />
    <path d="M4.4 9.6h9.4a5.8 5.8 0 0 1 0 11.6H9.8" />
  </>
));

export const ArrowClockwise = createIcon("ArrowClockwise", () => (
  <>
    <path d="M20.3 12a8.3 8.3 0 1 1-2.43-5.87" />
    <path d="M20.3 3.7v5.5h-5.5" />
  </>
));

export const TrendUp = createIcon("TrendUp", () => (
  <>
    <path d="m3.6 16.8 5.6-5.6 3.6 3.6 7.6-7.6" />
    <path d="M15.2 7.2h5.2v5.2" />
  </>
));

export const ShareNetwork = createIcon("ShareNetwork", () => (
  <>
    <circle cx="17.6" cy="5.4" r="2.8" />
    <circle cx="6.4" cy="12" r="2.8" />
    <circle cx="17.6" cy="18.6" r="2.8" />
    <path d="m8.8 10.6 6.4-3.8M8.8 13.4l6.4 3.8" />
  </>
));

export const Copy = createIcon("Copy", () => (
  <>
    <path d="M9.6 8h8.8a1.8 1.8 0 0 1 1.8 1.8v9.8a1.8 1.8 0 0 1-1.8 1.8H9.6a1.8 1.8 0 0 1-1.8-1.8V9.8A1.8 1.8 0 0 1 9.6 8Z" />
    <path d="M15.6 8V4.2a1.8 1.8 0 0 0-1.8-1.8H4.2a1.8 1.8 0 0 0-1.8 1.8v9.6a1.8 1.8 0 0 0 1.8 1.8H7.8" />
  </>
));

export const Pencil = createIcon("Pencil", () => (
  <>
    <path d="M16.4 2.8 21.2 7.6 8.2 20.6l-6 1.2 1.2-6Z" />
    <path d="m13.8 5.4 4.8 4.8" />
  </>
));

export const Trash = createIcon("Trash", () => (
  <>
    <path d="M3.8 6.4h16.4" />
    <path d="M8.4 6.4V4.8a1.6 1.6 0 0 1 1.6-1.6h4a1.6 1.6 0 0 1 1.6 1.6v1.6" />
    <path d="M18.4 6.4v12.8a1.8 1.8 0 0 1-1.8 1.8H7.4a1.8 1.8 0 0 1-1.8-1.8V6.4" />
    <path d="M10.2 10.6v6M13.8 10.6v6" />
  </>
));

export const FileText = createIcon("FileText", () => (
  <>
    <path d="M13.6 2.8H6.6a1.8 1.8 0 0 0-1.8 1.8v14.8a1.8 1.8 0 0 0 1.8 1.8h10.8a1.8 1.8 0 0 0 1.8-1.8V8.2Z" />
    <path d="M13.6 2.8v4.2a1.2 1.2 0 0 0 1.2 1.2h4.4" />
    <path d="M8.4 13.2h7.2M8.4 16.6h5" />
  </>
));

export const Receipt = createIcon("Receipt", () => (
  <>
    <path d="M4.8 2.8h14.4v18.4l-2.4-1.8-2.4 1.8-2.4-1.8-2.4 1.8-2.4-1.8-2.4 1.8Z" />
    <path d="M8.6 8.4h6.8M8.6 12.4h6.8" />
  </>
));

export const Scroll = createIcon("Scroll", () => (
  <>
    <path d="M4.4 7.4a2.6 2.6 0 0 1 5.2 0v9.2a3 3 0 0 0 3 3h4.4a3 3 0 0 0 3-3V7.4a2.6 2.6 0 0 0-2.6-2.6H7" />
    <path d="M4.4 7.4h5.2M13 9.4h4M13 13h4" />
  </>
));

export const Briefcase = createIcon("Briefcase", () => (
  <>
    <path d="M3.4 8.6h17.2a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H3.4a1.6 1.6 0 0 1-1.6-1.6v-8a1.6 1.6 0 0 1 1.6-1.6Z" />
    <path d="M8.4 8.6V6.4a1.8 1.8 0 0 1 1.8-1.8h3.6a1.8 1.8 0 0 1 1.8 1.8v2.2" />
    <path d="M1.8 13.2a19.4 19.4 0 0 0 20.4 0" />
  </>
));

export const Wallet = createIcon("Wallet", () => (
  <>
    <path d="M3.2 7.4a2 2 0 0 1 2-2h13.6a2 2 0 0 1 2 2v11.2a2 2 0 0 1-2 2H5.2a2 2 0 0 1-2-2Z" />
    <path d="M20.8 10.8h-3.4a2.4 2.4 0 0 0 0 4.8h3.4" />
  </>
));

export const HandCoins = createIcon("HandCoins", () => (
  <>
    <circle cx="8.6" cy="6" r="3.2" />
    <circle cx="16.4" cy="7.4" r="2.6" />
    <path d="M2.4 15.6h3.4l2.2 2h4.4a1.6 1.6 0 0 0 0-3.2H9.6" />
    <path d="M12.4 14.4h2.8a2 2 0 0 0 1.3-.48l3-2.5a1.7 1.7 0 0 1 2.3 2.5l-4.6 4.3a3 3 0 0 1-2.05.8H8l-2.2-2H2.4" />
  </>
));

export const Gift = createIcon("Gift", () => (
  <>
    <path d="M2.8 7.8h18.4v4H2.8Z" />
    <path d="M4.6 11.8v7.6a1.8 1.8 0 0 0 1.8 1.8h11.2a1.8 1.8 0 0 0 1.8-1.8v-7.6" />
    <path d="M12 7.8v13.4" />
    <path d={GIFT_BOW_L} />
    <path d={GIFT_BOW_R} />
  </>
));

export const Confetti = createIcon("Confetti", () => (
  <>
    <path d="m2.8 21.2 4.4-11.8 7.4 7.4Z" />
    <path d="M14.6 4.6 15.8 3.4M18.2 8.6l1.4-1.4M17 3.4l.9 1.7M20.4 11.8l1.8-.4M12.6 8l1.7.9" />
  </>
));

export const Cookie = createIcon("Cookie", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    {dot(9, 9, 1.05)}
    {dot(14.6, 8.6, 1.05)}
    {dot(15.4, 14.4, 1.05)}
    {dot(9.4, 15.2, 1.05)}
    {dot(12.2, 12.2, 1.05)}
  </>
));

export const Lifebuoy = createIcon("Lifebuoy", () => (
  <>
    <circle cx="12" cy="12" r="9.2" />
    <circle cx="12" cy="12" r="4" />
    <path d="m5.5 5.5 3.7 3.7M18.5 5.5l-3.7 3.7M18.5 18.5l-3.7-3.7M5.5 18.5l3.7-3.7" />
  </>
));

export const QuestionCircle = createIcon(
  "QuestionCircle",
  () => <path d={QUESTION_CIRCLE} {...SOLID} />,
  { viewBox: "0 0 20 20" },
);

export const MusicNote = createIcon("MusicNote", () => (
  <>
    <path d="M9.8 17.8V5.4l7.4-1.8v10.6" />
    <circle cx="7" cy="17.8" r="2.8" />
    <circle cx="14.4" cy="14.2" r="2.8" />
  </>
));

export const PawPrint = createIcon("PawPrint", () => (
  <>
    <ellipse cx="6.8" cy="9.4" rx="2.1" ry="2.7" />
    <ellipse cx="11.4" cy="6.6" rx="2.1" ry="2.8" />
    <ellipse cx="16.4" cy="8.4" rx="2.1" ry="2.7" />
    <ellipse cx="19.6" cy="13" rx="1.9" ry="2.3" />
    <path d="M11.8 13.2c2.7 0 4.9 2.3 4.9 4.8a3 3 0 0 1-3 3c-1 0-1.6-.4-1.9-.4s-.9.4-1.9.4a3 3 0 0 1-3-3c0-2.5 2.2-4.8 4.9-4.8Z" />
  </>
));

export const SpeakerSimpleX = createIcon("SpeakerSimpleX", () => (
  <>
    <path d="M3.4 9.4h3.4l5-4.2a.8.8 0 0 1 1.3.62v12.36a.8.8 0 0 1-1.3.62l-5-4.2H3.4a.8.8 0 0 1-.8-.8V10.2a.8.8 0 0 1 .8-.8Z" />
    <path d="m17 9.6 4.4 4.8M21.4 9.6 17 14.4" />
  </>
));

export const SlidersHorizontal = createIcon("SlidersHorizontal", () => (
  <>
    <path d="M3.6 7.2h3.6M12 7.2h8.4" />
    <circle cx="9.6" cy="7.2" r="2.4" />
    <path d="M3.6 16.8h7.4M16.2 16.8h4.2" />
    <circle cx="13.6" cy="16.8" r="2.4" />
  </>
));

export const Sidebar = createIcon("Sidebar", () => (
  <>
    <path d="M4.4 4.4h15.2a1.8 1.8 0 0 1 1.8 1.8v11.6a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V6.2a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M9.4 4.4v15.2" />
    <path d="M5.6 9h1.8M5.6 12h1.8" />
  </>
));

export const SidebarSimple = createIcon("SidebarSimple", () => (
  <>
    <path d="M4.4 4.4h15.2a1.8 1.8 0 0 1 1.8 1.8v11.6a1.8 1.8 0 0 1-1.8 1.8H4.4a1.8 1.8 0 0 1-1.8-1.8V6.2a1.8 1.8 0 0 1 1.8-1.8Z" />
    <path d="M9.4 4.4v15.2" />
  </>
));

export const SignIn = createIcon("SignIn", () => (
  <>
    <path d="M14.4 4.4h4.2a1.8 1.8 0 0 1 1.8 1.8v11.6a1.8 1.8 0 0 1-1.8 1.8h-4.2" />
    <path d="m9.6 8.2 3.8 3.8-3.8 3.8" />
    <path d="M13.4 12H3.6" />
  </>
));

export const SignOut = createIcon("SignOut", () => (
  <>
    <path d="M9.6 4.4H5.4a1.8 1.8 0 0 0-1.8 1.8v11.6a1.8 1.8 0 0 0 1.8 1.8h4.2" />
    <path d="m16.4 8.2 3.8 3.8-3.8 3.8" />
    <path d="M20.2 12h-9.8" />
  </>
));
