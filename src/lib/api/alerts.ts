import { supabase } from '@/lib/supabase';
import type { Alert, AlertComment, AlertCategory } from '@/types';
import { MOCK_ALERTS, MOCK_COMMENTS } from '@/lib/mock/data';

const ALERT_SELECT = `
  *,
  user:users!user_id(id, full_name, avatar_url)
`;

export async function fetchAlerts(limit = 20, offset = 0): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(ALERT_SELECT)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error || !data || data.length === 0) return MOCK_ALERTS;
  return data as Alert[];
}

export async function fetchAlertPreview(): Promise<Alert[]> {
  const { data, error } = await supabase
    .from('announcements')
    .select(ALERT_SELECT)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error || !data || data.length === 0) return MOCK_ALERTS.slice(0, 5);
  return data as Alert[];
}

export async function fetchAlertComments(alertId: string): Promise<AlertComment[]> {
  const { data, error } = await supabase
    .from('alert_comments')
    .select('*, user:users!user_id(id, full_name, avatar_url)')
    .eq('alert_id', alertId)
    .order('created_at', { ascending: true });
  if (error || !data || data.length === 0) return MOCK_COMMENTS[alertId] ?? [];
  return data as AlertComment[];
}

export async function createAlert(alert: {
  user_id: string;
  location: string;
  category: AlertCategory;
  content: string;
}): Promise<Alert> {
  const { data, error } = await supabase
    .from('announcements')
    .insert(alert)
    .select(ALERT_SELECT)
    .single();
  if (error) throw error;
  return data as Alert;
}

export async function addAlertComment(comment: {
  alert_id: string;
  user_id: string;
  content: string;
}): Promise<AlertComment> {
  const { data, error } = await supabase
    .from('alert_comments')
    .insert(comment)
    .select('*, user:users!user_id(id, full_name, avatar_url)')
    .single();
  if (error) throw error;
  return data as AlertComment;
}

export async function reactToAlert(alertId: string, userId: string, reaction: string) {
  const { error } = await supabase
    .from('alert_reactions')
    .upsert({ alert_id: alertId, user_id: userId, reaction }, { onConflict: 'alert_id,user_id' });
  if (error) throw error;
}
