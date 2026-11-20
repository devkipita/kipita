/**
 * The topics an FAQ can belong to. The faqs.topic column (migration 065) accepts the same list,
 * so adding a topic means adding it here and in a new migration.
 *
 * Kept free of imports so server and browser code can both read it.
 */
export const FAQ_TOPICS = ["general", "alerts"] as const;

export type FaqTopic = (typeof FAQ_TOPICS)[number];

export const FAQ_TOPIC_LABEL: Record<FaqTopic, string> = {
  general: "General",
  alerts: "Road alerts",
};

/** The topic the road-alerts page asks for. */
export const ALERTS_FAQ_TOPIC: FaqTopic = "alerts";

export function isFaqTopic(value: unknown): value is FaqTopic {
  return typeof value === "string" && (FAQ_TOPICS as readonly string[]).includes(value);
}
