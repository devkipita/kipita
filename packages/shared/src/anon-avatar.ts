/**
 * The anonymous picture shown next to a person on a public surface such as a road
 * alert. It is picked from the person's id, so the same person always gets the same
 * one, and it says nothing about who they are: their own photo is never used.
 *
 * `palette` and `shape` are indexes. The app decides how to draw them; keep the two
 * counts in step with the drawing code.
 */
export const ANON_AVATAR_PALETTES = 6;
export const ANON_AVATAR_SHAPES = 6;

export interface AnonAvatar {
  palette: number;
  shape: number;
}

/** FNV-1a, 32 bit. Plain and stable, so every app can reproduce it. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function anonAvatarFor(id: string | null | undefined): AnonAvatar {
  const h = hash((id ?? "").trim().toLowerCase());
  return {
    palette: h % ANON_AVATAR_PALETTES,
    shape: Math.floor(h / ANON_AVATAR_PALETTES) % ANON_AVATAR_SHAPES,
  };
}
