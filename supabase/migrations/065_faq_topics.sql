-- 065_faq_topics.sql
-- Lets an FAQ belong to a topic, so each page can show the questions that fit it.
--
-- The road-alerts page ("Good to know" panel) used to show the first four help-centre
-- FAQs by sort order: payment, safety, phone sign-up, becoming a driver. None of them is
-- about alerts. It now asks for topic = 'alerts' and gets the four below.
--
-- Every existing FAQ is 'general', so the /help page is unchanged and keeps showing all
-- of them; the new alert answers follow the general ones (sort_order 10 to 13).
--
-- The answers describe what the app does today:
--   one Still there / Cleared vote per person per alert (migration 022), switchable or
--     removable
--   Cleared at 3 votes: sinks to the bottom of the feed and leaves "What's happening on
--     the roads" (packages/shared/src/alert-status.ts)
--   edit and delete only in the first 5 minutes (RLS policies in migration 022)
--   999 and 112 are Kenya's national emergency numbers
-- If any of those change, change the answer in the admin FAQ manager.
--
-- Safe to run more than once. To undo: DELETE the topic = 'alerts' rows, then
-- ALTER TABLE public.faqs DROP COLUMN topic;

BEGIN;

ALTER TABLE public.faqs ADD COLUMN IF NOT EXISTS topic TEXT NOT NULL DEFAULT 'general';

ALTER TABLE public.faqs DROP CONSTRAINT IF EXISTS faqs_topic_check;
ALTER TABLE public.faqs ADD CONSTRAINT faqs_topic_check CHECK (topic IN ('general', 'alerts'));

CREATE INDEX IF NOT EXISTS idx_faqs_topic_order ON public.faqs (topic, sort_order) WHERE is_published;

INSERT INTO public.faqs (question, answer, sort_order, topic) VALUES
  (
    'What do Still there and Cleared mean?',
    'Tap Still there if you can see the problem. Tap Cleared if the road is back to normal. You get one vote per alert. Tap the same button again to take your vote back, or tap the other one to change it.',
    10, 'alerts'
  ),
  (
    'What happens when an alert is cleared?',
    'When 3 people mark an alert Cleared, it is labelled Cleared, moves to the bottom of the feed and drops out of “What’s happening on the roads”. You can still open and read it. If the problem comes back, post a new alert.',
    11, 'alerts'
  ),
  (
    'Who can post or edit an alert?',
    'Anyone who is signed in can post one. You can edit or delete your own alert for 5 minutes after posting. After that it stays as posted, so keep it short and factual.',
    12, 'alerts'
  ),
  (
    'My car broke down or I feel unsafe. What do I do?',
    'If anyone is hurt or in danger, call 999 or 112 first. If you can, move somewhere safe. Then contact Kipita from the Help page so we can look at your booking. Once you are safe, a road alert warns other drivers.',
    13, 'alerts'
  )
ON CONFLICT (question) DO NOTHING;

COMMIT;
