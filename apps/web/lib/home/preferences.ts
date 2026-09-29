import {
  Briefcase,
  MusicNote,
  PawPrint,
  SpeakerSimpleX,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { RidePreferences } from "@/lib/ride-detail";

/**
 * The four ride preferences, in one place.
 *
 * The same list was written out three times before — the planner toggles, the
 * post drawer and the detail chips — and the detail page had already drifted
 * ("Pets welcome" against "Pets"). One vocabulary keeps a preference reading
 * the same wherever it appears.
 *
 * `trips.preferences` is a JSONB blob with no schema behind it, so every key is
 * optional and only a literal `true` counts.
 */
export const PREFERENCE_OPTIONS: {
  key: keyof RidePreferences;
  label: string;
  icon: KipitaIcon;
}[] = [
  { key: "luggage", label: "Luggage", icon: Briefcase },
  { key: "pets", label: "Pets welcome", icon: PawPrint },
  { key: "silent_ride", label: "Quiet ride", icon: SpeakerSimpleX },
  { key: "music", label: "Music", icon: MusicNote },
];

/** Only the preferences that are actually on. Absence is not information. */
export function activePreferences(prefs: RidePreferences | null | undefined) {
  if (!prefs) return [];
  return PREFERENCE_OPTIONS.filter((option) => prefs[option.key] === true);
}
