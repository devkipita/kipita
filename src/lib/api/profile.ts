import { supabase } from '@/lib/supabase';
import type { User } from '@/types';

export async function fetchProfile(userId: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data as User;
}

export async function updateProfile(userId: string, updates: Partial<Pick<User, 'full_name' | 'phone' | 'email' | 'avatar_url'>>): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as User;
}

export async function fetchUserById(userId: string): Promise<User> {
  return fetchProfile(userId);
}
