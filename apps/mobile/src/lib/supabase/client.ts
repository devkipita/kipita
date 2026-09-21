import { createClient, processLock } from "@supabase/supabase-js";
import { MMKV } from "react-native-mmkv";
import Constants from "expo-constants";
import { Platform } from "react-native";

const storage = new MMKV({ id: "supabase-auth" });

/** MMKV-backed storage adapter for Supabase Auth persistence */
const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

const supabaseUrl =
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  Constants.expoConfig?.extra?.supabaseUrl;

const supabasePublishableKey =
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.EXPO_PUBLIC_SUPABASE_KEY ??
  Constants.expoConfig?.extra?.supabaseKey;

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    "Missing Supabase configuration. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
  );
}

// Reuse the client across Fast Refresh reloads so `processLock` never
// deadlocks waiting on a lock held by a discarded GoTrueClient instance.
declare global {
  // eslint-disable-next-line no-var
  var __kipitaSupabase: ReturnType<typeof createClient> | undefined;
}

export const supabase =
  globalThis.__kipitaSupabase ??
  createClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      storage: mmkvStorageAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      flowType: "pkce",
      // The navigator-lock based processLock doesn't survive web page
      // reloads cleanly; only use it on native platforms.
      lock: Platform.OS === "web" ? undefined : processLock,
    },
  });

if (__DEV__) {
  globalThis.__kipitaSupabase = supabase;
}
