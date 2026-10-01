import {
  Briefcase,
  MusicNote,
  PawPrint,
  Prohibit,
  SpeakerSimpleX,
} from "@/components/icons";
import type { KipitaIcon } from "@/components/icons";
import type { ToneName } from "@/lib/theme";
import type { RidePreferences } from "@/lib/ride-detail";

export type PreferenceKind = "perk" | "rule";

export const PREFERENCE_OPTIONS: {
  key: keyof RidePreferences;
  label: string;
  icon: KipitaIcon;
  kind: PreferenceKind;
  tone: ToneName;
}[] = [
  { key: "luggage", label: "Luggage", icon: Briefcase, kind: "perk", tone: "blue" },
  { key: "pets", label: "Pets welcome", icon: PawPrint, kind: "perk", tone: "tan" },
  {
    key: "silent_ride",
    label: "Quiet ride",
    icon: SpeakerSimpleX,
    kind: "perk",
    tone: "mint",
  },
  { key: "music", label: "Music", icon: MusicNote, kind: "perk", tone: "lav" },
  {
    key: "no_smoking",
    label: "No smoking",
    icon: Prohibit,
    kind: "rule",
    tone: "amber",
  },
];

export function activePreferences(prefs: RidePreferences | null | undefined) {
  if (!prefs) return [];
  return PREFERENCE_OPTIONS.filter((option) => prefs[option.key] === true);
}
