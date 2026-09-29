export type SupportCaseStatus = "open" | "awaiting_reply" | "resolved";

export interface SupportCase {
  id: string;
  booking_id: string | null;
  category: string;
  subject: string;
  detail: string;
  status: SupportCaseStatus;
  created_at: string;
  updated_at: string;
}

export interface SupportMessage {
  id: string;
  case_id: string;
  author_id: string | null;
  from_support: boolean;
  body: string;
  image_path: string | null;
  created_at: string;
  /** Signed on read — `support-media` is private. */
  image_url?: string | null;
}

export const CASE_COLUMNS =
  "id, booking_id, category, subject, detail, status, created_at, updated_at";

export const MESSAGE_COLUMNS =
  "id, case_id, author_id, from_support, body, image_path, created_at";

export function isOpen(c: SupportCase): boolean {
  return c.status !== "resolved";
}
