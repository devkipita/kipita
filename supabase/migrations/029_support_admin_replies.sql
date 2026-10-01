DROP POLICY IF EXISTS "Case messages written by support" ON public.support_case_messages;
CREATE POLICY "Case messages written by support" ON public.support_case_messages
  FOR INSERT WITH CHECK (
    public.is_admin()
    AND from_support = TRUE
    AND author_id = public.current_app_user_id()
  );

CREATE INDEX IF NOT EXISTS idx_support_cases_updated
  ON public.support_cases(updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_case_on_message()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.support_cases
     SET status = CASE
                    WHEN status = 'resolved' THEN status
                    WHEN NEW.from_support THEN 'awaiting_reply'::public.support_case_status
                    ELSE 'open'::public.support_case_status
                  END,
         updated_at = NOW()
   WHERE id = NEW.case_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_case_on_message ON public.support_case_messages;
CREATE TRIGGER trg_touch_case_on_message
  AFTER INSERT ON public.support_case_messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_case_on_message();

