import { createClient } from '@supabase/supabase-js';
import { MMKV } from 'react-native-mmkv';
import Constants from 'expo-constants';

const storage = new MMKV({ id: 'supabase-auth' });

/** MMKV-backed storage adapter for Supabase Auth persistence */
const mmkvStorageAdapter = {
  getItem: (key: string) => storage.getString(key) ?? null,
  setItem: (key: string, value: string) => storage.set(key, value),
  removeItem: (key: string) => storage.delete(key),
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL
  ?? Constants.expoConfig?.extra?.supabaseUrl
  ?? 'https://zrqpmbcxdupjkhhcfadw.supabase.co';

const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_KEY
  ?? Constants.expoConfig?.extra?.supabaseKey
  ?? 'sb_publishable_379nJ1-qGhjKosvt9fO44A_dRjEVtRN';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: mmkvStorageAdapter,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
