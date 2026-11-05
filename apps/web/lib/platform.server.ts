import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { EMPTY_PLATFORM, type Platform } from "./platform";

export const fetchPlatform = cache(async (): Promise<Platform> => {
  try {
    const supabase = await createClient();
    const [settings, flags] = await Promise.all([
      supabase.from("platform_settings").select("key, value"),
      supabase.from("feature_flags").select("key, enabled"),
    ]);

    const out: Platform = { settings: {}, flags: {} };

    for (const row of settings.data ?? []) {
      const parsed = Number(row.value);
      if (Number.isFinite(parsed)) out.settings[row.key as string] = parsed;
    }
    for (const row of flags.data ?? []) {
      out.flags[row.key as string] = row.enabled === true;
    }

    return out;
  } catch {
    return EMPTY_PLATFORM;
  }
});
