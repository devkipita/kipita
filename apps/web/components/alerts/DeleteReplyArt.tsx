import { Mascot, SceneSvg } from "@/components/trips/TripsArt";

export function DeleteReplyArt() {
  return (
    <SceneSvg viewBox="0 0 320 180" fill="none" aria-hidden="true" focusable="false">
      <Mascot />
      <circle className="ink-fill" cx="200" cy="106" r="3" />
      <circle className="ink-fill" cx="214" cy="106" r="3" />
      <path className="ink" strokeWidth="2.6" d="M203 116h9" />
      <path
        className="tint ink"
        strokeWidth="2.6"
        strokeDasharray="6 7"
        d="M244 34h40c10 0 16 6 16 16v12c0 10-6 16-16 16h-24l-14 10 3-10h-5c-10 0-16-6-16-16V50c0-10 6-16 16-16Z"
      />
      <path className="ink" strokeWidth="2.6" d="M244 52h32M244 62h20" />
      <circle className="cta-fill ink" strokeWidth="2.6" cx="300" cy="34" r="18" />
      <path className="on-cta" strokeWidth="2.6" d="M292 29h16M297 29v-3h6v3M294 32l1.5 11h9l1.5-11" />
    </SceneSvg>
  );
}
