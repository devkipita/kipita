/**
 * Road alerts — mirrors `public.announcements` and friends (migrations 001,
 * 009, 010).
 *
 * Selects are column-explicit rather than `*` for two reasons: migration 004
 * revoked blanket SELECT on `public.users`, and mobile's `Alert` type declares
 * a `views_count` that has no column behind it. Naming columns means the
 * phantom can never sneak back in.
 */

export type AlertCategory =
  | "traffic"
  | "accident"
  | "road_closure"
  | "weather"
  | "police"
  | "general";

export interface AlertAuthor {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
}

export interface Alert {
  id: string;
  user_id: string;
  location: string;
  category: AlertCategory;
  content: string;
  image_url: string | null;
  reactions_count: number;
  comments_count: number;
  created_at: string;
  user: AlertAuthor | null;
  /** The caller's own reaction key, resolved by a separate scoped query. */
  user_reaction: string | null;
}

export interface AlertComment {
  id: string;
  alert_id: string;
  user_id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  created_at: string;
  user: AlertAuthor | null;
  liked_by_me: boolean;
}

export const ALERT_SELECT = `
  id, user_id, location, category, content, image_url,
  reactions_count, comments_count, created_at,
  user:users!user_id ( id, full_name, avatar_url )
`;

export const COMMENT_SELECT = `
  id, alert_id, user_id, content, image_url, likes_count, created_at,
  user:users!user_id ( id, full_name, avatar_url )
`;

/**
 * The four reaction keys mobile writes to `alert_reactions.reaction`. Web
 * stores the identical keys so a reaction made on either client reads on the
 * other; only the presentation differs (mobile draws emoji, web draws lucide
 * icons — this app is emoji-free). See REACTION_META in `meta.ts`.
 */
export const REACTION_KEYS = ["thumbs_up", "heart", "wow", "sad"] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];
