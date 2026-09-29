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
  trusted_reporter: boolean;
}

export type ConfirmKind = "still_there" | "cleared";

export interface Alert {
  id: string;
  user_id: string;
  location: string;
  category: AlertCategory;
  content: string;
  image_url: string | null;
  lat: number | null;
  lng: number | null;
  reactions_count: number;
  comments_count: number;
  confirms_count: number;
  cleared_count: number;
  views_count: number;
  created_at: string;
  updated_at: string;
  user: AlertAuthor | null;
  /** The caller's own reaction key, resolved by a separate scoped query. */
  user_reaction: string | null;
  /** The caller's own Still-there / Cleared vote, resolved the same way. */
  my_confirmation: ConfirmKind | null;
  saved_by_me: boolean;
  /** Kilometres from the viewer, when both ends are known. */
  distance_km?: number | null;
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
  id, user_id, location, category, content, image_url, lat, lng,
  reactions_count, comments_count, confirms_count, cleared_count, views_count,
  created_at, updated_at,
  user:users!user_id ( id, full_name, avatar_url, trusted_reporter )
`;

/**
 * The same list without `views_count`, for deployments where migration 023 has
 * not been applied yet. An undefined column fails the whole request, so asking
 * for one that does not exist empties the feed rather than dropping a field.
 */
export const ALERT_SELECT_LEGACY = `
  id, user_id, location, category, content, image_url, lat, lng,
  reactions_count, comments_count, confirms_count, cleared_count,
  created_at, updated_at,
  user:users!user_id ( id, full_name, avatar_url, trusted_reporter )
`;

export const COMMENT_SELECT = `
  id, alert_id, user_id, content, image_url, likes_count, created_at,
  user:users!user_id ( id, full_name, avatar_url, trusted_reporter )
`;

/**
 * The four reaction keys mobile writes to `alert_reactions.reaction`. Web
 * stores the identical keys so a reaction made on either client reads on the
 * other; only the presentation differs (mobile draws emoji, web draws lucide
 * icons — this app is emoji-free). See REACTION_META in `meta.ts`.
 */
export const REACTION_KEYS = ["thumbs_up", "heart", "wow", "sad"] as const;

export type ReactionKey = (typeof REACTION_KEYS)[number];
