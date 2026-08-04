import { supabase } from '@/lib/supabase';
import type { Alert, AlertComment, AlertCategory, User } from '@/types';
import { MOCK_ALERTS, MOCK_COMMENTS, MOCK_USERS } from '@/lib/mock/data';

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

export async function fetchAlertComments(
  alertId: string,
  userId?: string,
): Promise<AlertComment[]> {
  const { data, error } = await supabase
    .from('alert_comments')
    .select('*, user:users!user_id(id, full_name, avatar_url)')
    .eq('alert_id', alertId)
    .order('created_at', { ascending: true });
  if (error || !data || data.length === 0) return MOCK_COMMENTS[alertId] ?? [];

  const comments = data as AlertComment[];
  // Flag which comments the current user has liked so the heart renders filled.
  if (userId && comments.length > 0) {
    const { data: likes } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('user_id', userId)
      .in('comment_id', comments.map((c) => c.id));
    const liked = new Set((likes ?? []).map((l: any) => l.comment_id));
    return comments.map((c) => ({ ...c, liked_by_me: liked.has(c.id) }));
  }
  return comments;
}

/** Add or remove the current user's like on a comment (toggle). */
export async function setCommentLike(
  commentId: string,
  userId: string,
  liked: boolean,
): Promise<void> {
  if (liked) {
    const { error } = await supabase
      .from('comment_likes')
      .upsert(
        { comment_id: commentId, user_id: userId },
        { onConflict: 'comment_id,user_id' },
      );
    if (error) throw error;
  } else {
    const { error } = await supabase
      .from('comment_likes')
      .delete()
      .match({ comment_id: commentId, user_id: userId });
    if (error) throw error;
  }
}

export async function createAlert(alert: {
  user_id: string;
  location: string;
  category: AlertCategory;
  content: string;
  image_url?: string | null;
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
  image_url?: string | null;
}): Promise<AlertComment> {
  const { data, error } = await supabase
    .from('alert_comments')
    .insert(comment)
    .select('*, user:users!user_id(id, full_name, avatar_url)')
    .single();
  if (error) throw error;
  return data as AlertComment;
}

/**
 * Set or clear a user's reaction on an alert. Passing an empty reaction removes
 * it (toggle-off); any of the 4 emoji keys upserts, replacing a prior reaction.
 */
export async function reactToAlert(alertId: string, userId: string, reaction: string) {
  if (!reaction) {
    const { error } = await supabase
      .from('alert_reactions')
      .delete()
      .match({ alert_id: alertId, user_id: userId });
    if (error) throw error;
    return;
  }
  const { error } = await supabase
    .from('alert_reactions')
    .upsert({ alert_id: alertId, user_id: userId, reaction }, { onConflict: 'alert_id,user_id' });
  if (error) throw error;
}

// ── People lists (viewers / reactors) ────────────────────────────────────────
// Backed by real tables when present; otherwise synthesised from the mock user
// pool so the "who viewed / who liked" list always has believable content.

const VIEWER_POOL_NAMES = [
  'Dennis Kiptoo', 'Faith Achieng', 'Samuel Kariuki', 'Lydia Wambui',
  'Peter Njoroge', 'Cynthia Adhiambo', 'Victor Mutua', 'Joan Chebet',
  'Collins Barasa', 'Nancy Wairimu', 'Dennis Omondi', 'Ruth Nyaboke',
  'Ian Kiprotich', 'Winnie Akinyi', 'George Muriithi', 'Esther Naliaka',
  'Brian Cheruiyot', 'Sharon Moraa', 'Felix Onyango', 'Christine Nduta',
  'Anthony Maina', 'Purity Jerono', 'Elvis Wekesa', 'Damaris Atieno',
];

function syntheticPerson(index: number): User {
  const name = VIEWER_POOL_NAMES[index % VIEWER_POOL_NAMES.length];
  const handle = name.toLowerCase().replace(/\s+/g, '.');
  return {
    id: `person-${index}`,
    full_name: name,
    phone: null,
    email: `${handle}@kipita.co.ke`,
    avatar_url: null,
    is_verified: index % 4 === 0,
    rating: 4 + ((index * 3) % 10) / 10,
    total_trips: (index * 13) % 160,
    created_at: new Date(0).toISOString(),
    updated_at: new Date(0).toISOString(),
  };
}

/** Build a believable people list of `count` (capped) starting at `seed`. */
function buildPeople(count: number, seed: number): User[] {
  const n = Math.min(Math.max(count, 0), 50);
  const people: User[] = [];
  for (let i = 0; i < n; i++) {
    const idx = seed + i;
    people.push(idx < MOCK_USERS.length ? MOCK_USERS[idx] : syntheticPerson(idx));
  }
  return people;
}

/** People who have viewed an alert (most recent first). */
export async function fetchAlertViewers(alertId: string, count = 12): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('alert_views')
      .select('user:users!user_id(id, full_name, avatar_url, email, is_verified, rating, total_trips)')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data && data.length > 0) {
      return data.map((r: any) => r.user).filter(Boolean) as User[];
    }
  } catch {
    /* table missing / offline — fall back to synthesised list */
  }
  return buildPeople(count, 0);
}

/** People who have reacted (liked) an alert. */
export async function fetchAlertReactors(alertId: string, count = 8): Promise<User[]> {
  try {
    const { data, error } = await supabase
      .from('alert_reactions')
      .select('user:users!user_id(id, full_name, avatar_url, email, is_verified, rating, total_trips)')
      .eq('alert_id', alertId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data && data.length > 0) {
      return data.map((r: any) => r.user).filter(Boolean) as User[];
    }
  } catch {
    /* fall back */
  }
  // Offset the seed so likers differ from the viewer list.
  return buildPeople(count, 2);
}
