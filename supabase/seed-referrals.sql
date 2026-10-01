DO $$
DECLARE
  v_ref      RECORD;
  v_seed     RECORD;
  v_referrer UUID;
  v_code     TEXT;
  v_friend   UUID;
  v_auth     UUID;
  v_email    TEXT;
  v_password TEXT := 'KipitaTest123!';
  v_total    INT := 0;
BEGIN
  IF to_regprocedure('public.ensure_referral_code(uuid)') IS NULL THEN
    RAISE NOTICE 'Migration 030 is not applied - nothing seeded.';
    RETURN;
  END IF;

  FOR v_ref IN
    SELECT * FROM (VALUES
      ('rider@kipita.test',        'rider'),
      ('admin@kipita.test',        'admin'),
      ('dennistrevor06@gmail.com', 'dennis')
    ) AS t(email, tag)
  LOOP
    SELECT u.id INTO v_referrer
      FROM public.users u
      LEFT JOIN auth.users au ON au.id = u.auth_id
     WHERE LOWER(COALESCE(au.email, u.email)) = LOWER(v_ref.email)
     ORDER BY u.created_at
     LIMIT 1;

    IF v_referrer IS NULL THEN
      RAISE NOTICE 'skipped % - no users row (sign in once first)', v_ref.email;
      CONTINUE;
    END IF;

    v_code := public.ensure_referral_code(v_referrer);
    RAISE NOTICE '% -> code %', v_ref.email, v_code;

    FOR v_seed IN
      SELECT * FROM (VALUES
        ('wanjiku', 'Wanjiku Kamau', 'rewarded', 200, 26),
        ('brian',   'Brian Ochieng', 'rewarded', 200, 19),
        ('halima',  'Halima Abdi',   'rewarded', 250, 11),
        ('kevin',   'Kevin Maina',   'pending',    0,  4),
        ('njeri',   'Njeri Wambui',  'pending',    0,  1)
      ) AS t(slug, full_name, status, reward, days_ago)
    LOOP
      v_auth  := (md5(v_ref.tag || '|' || v_seed.slug))::UUID;
      v_email := v_seed.slug || '.' || v_ref.tag || '@kipita.test';

      INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password,
        email_confirmed_at, created_at, updated_at,
        raw_app_meta_data, raw_user_meta_data
      )
      VALUES (
        v_auth,
        '00000000-0000-0000-0000-000000000000',
        'authenticated', 'authenticated', v_email,
        extensions.crypt(v_password, extensions.gen_salt('bf')),
        NOW() - (v_seed.days_ago || ' days')::INTERVAL,
        NOW() - (v_seed.days_ago || ' days')::INTERVAL,
        NOW(),
        '{"provider":"email","providers":["email"]}'::JSONB,
        jsonb_build_object('full_name', v_seed.full_name)
      )
      ON CONFLICT (id) DO NOTHING;

      SELECT id INTO v_friend FROM public.users WHERE auth_id = v_auth;
      CONTINUE WHEN v_friend IS NULL OR v_friend = v_referrer;

      UPDATE public.users
         SET full_name  = v_seed.full_name,
             created_at = NOW() - (v_seed.days_ago || ' days')::INTERVAL
       WHERE id = v_friend;

      INSERT INTO public.referrals (
        referrer_id, referee_id, code, status,
        referrer_reward, referee_reward, created_at, rewarded_at
      )
      VALUES (
        v_referrer, v_friend, v_code,
        v_seed.status::public.referral_status,
        v_seed.reward,
        CASE WHEN v_seed.status = 'rewarded' THEN 100 ELSE 0 END,
        NOW() - (v_seed.days_ago || ' days')::INTERVAL,
        CASE WHEN v_seed.status = 'rewarded'
             THEN NOW() - ((v_seed.days_ago - 1) || ' days')::INTERVAL END
      )
      ON CONFLICT (referee_id) DO UPDATE
        SET referrer_id = EXCLUDED.referrer_id,
            code        = EXCLUDED.code;

      IF v_seed.status = 'rewarded' AND NOT EXISTS (
        SELECT 1 FROM public.wallet_transactions t
          JOIN public.wallets w ON w.id = t.wallet_id
         WHERE w.user_id = v_referrer
           AND t.type = 'referral'
           AND t.reference = 'seed-referral-' || v_friend::TEXT
      ) THEN
        PERFORM public.credit_wallet(
          v_referrer, v_seed.reward, 'referral',
          'seed-referral-' || v_friend::TEXT,
          'Referral bonus - ' || v_seed.full_name
        );
      END IF;

      v_total := v_total + 1;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Referral seed complete: % invite(s).', v_total;
END $$;

SELECT
  COALESCE(au.email, me.email) AS referrer,
  rc.code                      AS their_code,
  u.full_name                  AS referred,
  r.status,
  r.referrer_reward            AS earned
FROM public.referrals r
JOIN public.users me ON me.id = r.referrer_id
LEFT JOIN auth.users au ON au.id = me.auth_id
JOIN public.users u ON u.id = r.referee_id
LEFT JOIN public.referral_codes rc ON rc.user_id = me.id
WHERE LOWER(COALESCE(au.email, me.email)) IN (
  'rider@kipita.test', 'admin@kipita.test', 'dennistrevor06@gmail.com'
)
ORDER BY referrer, r.created_at DESC;

SELECT
  COALESCE(au.email, u.email) AS account,
  u.full_name,
  rc.code                     AS referral_code,
  u.created_at
FROM public.users u
LEFT JOIN auth.users au ON au.id = u.auth_id
LEFT JOIN public.referral_codes rc ON rc.user_id = u.id
WHERE COALESCE(au.email, u.email) NOT LIKE '%.rider@kipita.test'
  AND COALESCE(au.email, u.email) NOT LIKE '%.admin@kipita.test'
  AND COALESCE(au.email, u.email) NOT LIKE '%.dennis@kipita.test'
ORDER BY u.created_at DESC
LIMIT 25;
