BEGIN;

CREATE OR REPLACE FUNCTION public.admin_today()
RETURNS DATE
LANGUAGE sql
STABLE
AS $$
  SELECT (NOW() AT TIME ZONE 'Africa/Nairobi')::DATE;
$$;

CREATE OR REPLACE FUNCTION public.admin_overview()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := public.admin_today();
  v_out   JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'live_trips', (SELECT count(*) FROM trips WHERE status = 'in_progress'),
    'trips_today', (SELECT count(*) FROM trips WHERE departure_date = v_today AND status <> 'cancelled'),
    'bookings_today', (SELECT count(*) FROM bookings
                        WHERE (created_at AT TIME ZONE 'Africa/Nairobi')::DATE = v_today),
    'seat_value_today', (SELECT COALESCE(sum(total_price), 0) FROM bookings
                          WHERE (created_at AT TIME ZONE 'Africa/Nairobi')::DATE = v_today
                            AND status NOT IN ('cancelled', 'rejected')),
    'fees_today', (SELECT COALESCE(sum(platform_fee), 0) FROM payments
                    WHERE (paid_at AT TIME ZONE 'Africa/Nairobi')::DATE = v_today),
    'escrow_held', (SELECT COALESCE(sum(amount), 0) FROM payments WHERE escrow_status = 'held'),
    'open_reports', (SELECT count(*) FROM reports WHERE status IN ('open', 'reviewing')),
    'safety_reports', (SELECT count(*) FROM reports WHERE status = 'open' AND type = 'safety'),
    'pending_drivers', (SELECT count(*) FROM driver_profiles WHERE approval_status = 'pending'),
    'pending_refunds', (SELECT count(*) FROM refund_requests WHERE status = 'pending'),
    'failed_payouts', (SELECT count(*) FROM payments WHERE payout_status = 'failed'),
    'live_routes', COALESCE((
      SELECT jsonb_agg(r ORDER BY r.trips DESC)
        FROM (SELECT t.to_location AS city, count(*) AS trips
                FROM trips t WHERE t.status = 'in_progress'
               GROUP BY t.to_location) r
    ), '[]'::JSONB),
    'bookings_per_day', (
      SELECT jsonb_agg(jsonb_build_object('day', d.day::DATE, 'count', COALESCE(b.n, 0)) ORDER BY d.day)
        FROM generate_series(v_today - 13, v_today, INTERVAL '1 day') AS d(day)
        LEFT JOIN (SELECT (created_at AT TIME ZONE 'Africa/Nairobi')::DATE AS day, count(*) AS n
                     FROM bookings
                    WHERE created_at >= (v_today - 13)::TIMESTAMP AT TIME ZONE 'Africa/Nairobi'
                    GROUP BY 1) b ON b.day = d.day::DATE
    ),
    'top_routes', COALESCE((
      SELECT jsonb_agg(r ORDER BY r.bookings DESC)
        FROM (SELECT t.from_location AS "from", t.to_location AS "to",
                     count(b.id) AS bookings,
                     round(avg((t.seats_total - t.seats_available)::NUMERIC / NULLIF(t.seats_total, 0)) * 100) AS load
                FROM trips t
                JOIN bookings b ON b.trip_id = t.id
                 AND b.status IN ('confirmed', 'in_progress', 'completed')
               WHERE t.departure_date >= v_today - 30
               GROUP BY t.from_location, t.to_location
               ORDER BY count(b.id) DESC
               LIMIT 5) r
    ), '[]'::JSONB)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_trips(
  p_status TEXT DEFAULT NULL,
  p_search TEXT DEFAULT NULL,
  p_limit  INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  v_out    JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  WITH filtered AS (
    SELECT t.*, u.full_name AS driver_name, u.avatar_url AS driver_avatar,
           COALESCE(dp.rating, u.rating) AS driver_rating,
           v.make, v.model, v.plate_number, v.vehicle_type::TEXT AS vehicle_type
      FROM trips t
      JOIN users u ON u.id = t.driver_id
      LEFT JOIN driver_profiles dp ON dp.user_id = t.driver_id
      LEFT JOIN vehicles v ON v.id = t.vehicle_id
     WHERE (p_status IS NULL OR t.status::TEXT = p_status)
       AND (v_search IS NULL
            OR t.from_location ILIKE '%' || v_search || '%'
            OR t.to_location ILIKE '%' || v_search || '%'
            OR u.full_name ILIKE '%' || v_search || '%'
            OR v.plate_number ILIKE '%' || v_search || '%'
            OR t.id::TEXT ILIKE v_search || '%')
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'rows', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', f.id,
               'from', f.from_location,
               'to', f.to_location,
               'departure_date', f.departure_date,
               'departure_time', f.departure_time,
               'driver_name', f.driver_name,
               'driver_avatar', f.driver_avatar,
               'driver_rating', f.driver_rating,
               'vehicle', NULLIF(trim(COALESCE(f.make, '') || ' ' || COALESCE(f.model, '')), ''),
               'plate', f.plate_number,
               'vehicle_type', f.vehicle_type,
               'seats_total', f.seats_total,
               'seats_booked', f.seats_total - f.seats_available,
               'price_per_seat', f.price_per_seat,
               'status', f.status
             ) ORDER BY f.departure_date DESC, f.departure_time DESC)
        FROM (SELECT * FROM filtered
               ORDER BY departure_date DESC, departure_time DESC
               LIMIT LEAST(GREATEST(p_limit, 1), 100) OFFSET GREATEST(p_offset, 0)) f
    ), '[]'::JSONB)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_trip(p_trip_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_out JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'id', t.id,
    'from', t.from_location,
    'to', t.to_location,
    'departure_date', t.departure_date,
    'departure_time', t.departure_time,
    'status', t.status,
    'price_per_seat', t.price_per_seat,
    'seats_total', t.seats_total,
    'seats_booked', t.seats_total - t.seats_available,
    'created_at', t.created_at,
    'driver', jsonb_build_object('name', u.full_name, 'avatar', u.avatar_url, 'phone', u.phone),
    'vehicle', NULLIF(trim(COALESCE(v.make, '') || ' ' || COALESCE(v.model, '')), ''),
    'plate', v.plate_number,
    'bookings', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
               'id', b.id,
               'reference', b.booking_reference,
               'passenger', p.full_name,
               'avatar', p.avatar_url,
               'seats', b.seats_booked,
               'total', b.total_price,
               'status', b.status,
               'created_at', b.created_at,
               'escrow_status', pay.escrow_status,
               'platform_fee', pay.platform_fee,
               'driver_earning', pay.driver_earning,
               'held_at', pay.held_at,
               'released_at', pay.released_at
             ) ORDER BY b.created_at)
        FROM bookings b
        JOIN users p ON p.id = b.passenger_id
        LEFT JOIN LATERAL (
          SELECT * FROM payments x WHERE x.booking_id = b.id ORDER BY x.created_at DESC LIMIT 1
        ) pay ON TRUE
       WHERE b.trip_id = t.id
    ), '[]'::JSONB)
  ) INTO v_out
    FROM trips t
    JOIN users u ON u.id = t.driver_id
    LEFT JOIN vehicles v ON v.id = t.vehicle_id
   WHERE t.id = p_trip_id;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payments(
  p_tab   TEXT DEFAULT 'escrow',
  p_limit INTEGER DEFAULT 50
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today DATE := public.admin_today();
  v_out   JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT jsonb_build_object(
    'summary', jsonb_build_object(
      'held', (SELECT COALESCE(sum(amount), 0) FROM payments WHERE escrow_status = 'held'),
      'released_today', (SELECT COALESCE(sum(amount), 0) FROM payments
                          WHERE escrow_status = 'released'
                            AND (released_at AT TIME ZONE 'Africa/Nairobi')::DATE = v_today),
      'refunded_week', (SELECT COALESCE(sum(amount), 0) FROM payments
                         WHERE escrow_status = 'refunded'
                           AND refunded_at >= NOW() - INTERVAL '7 days'),
      'failed_payouts', (SELECT count(*) FROM payments WHERE payout_status = 'failed'),
      'pending_refunds', (SELECT count(*) FROM refund_requests WHERE status = 'pending')
    ),
    'rows', COALESCE((
      SELECT jsonb_agg(r ORDER BY r.created_at DESC)
        FROM (
          SELECT pay.id,
                 b.booking_reference AS reference,
                 pas.full_name AS passenger,
                 drv.full_name AS driver,
                 pay.amount,
                 pay.platform_fee,
                 pay.driver_earning,
                 pay.status,
                 pay.escrow_status,
                 pay.payout_status,
                 COALESCE(pay.transaction_reference, pay.provider_reference) AS receipt,
                 pay.method,
                 pay.created_at
            FROM payments pay
            LEFT JOIN bookings b ON b.id = pay.booking_id
            LEFT JOIN users pas ON pas.id = COALESCE(b.passenger_id, pay.payer_id, pay.user_id)
            LEFT JOIN users drv ON drv.id = b.driver_id
           WHERE CASE p_tab
                   WHEN 'payouts' THEN pay.escrow_status = 'released' OR pay.payout_status IS NOT NULL
                   WHEN 'refunds' THEN pay.escrow_status IN ('refunded', 'refund_pending')
                   ELSE COALESCE(pay.escrow_status::TEXT, 'none') <> 'none'
                 END
           ORDER BY pay.created_at DESC
           LIMIT LEAST(GREATEST(p_limit, 1), 200)
        ) r
    ), '[]'::JSONB)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_users(
  p_search TEXT DEFAULT NULL,
  p_role   TEXT DEFAULT NULL,
  p_limit  INTEGER DEFAULT 25,
  p_offset INTEGER DEFAULT 0
) RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_search TEXT := NULLIF(trim(COALESCE(p_search, '')), '');
  v_out    JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  WITH base AS (
    SELECT u.id, u.full_name, u.avatar_url, u.phone, u.email, u.is_verified, u.rating,
           u.total_trips, u.status::TEXT AS status, u.is_admin, u.created_at,
           EXISTS (SELECT 1 FROM driver_profiles d
                    WHERE d.user_id = u.id AND d.approval_status = 'approved') AS is_driver
      FROM users u
     WHERE u.deleted_at IS NULL
       AND (v_search IS NULL
            OR u.full_name ILIKE '%' || v_search || '%'
            OR u.phone ILIKE '%' || v_search || '%'
            OR u.email ILIKE '%' || v_search || '%')
  ), filtered AS (
    SELECT * FROM base
     WHERE CASE p_role
             WHEN 'admin' THEN is_admin
             WHEN 'driver' THEN is_driver
             WHEN 'rider' THEN NOT is_driver
             WHEN 'suspended' THEN status IN ('suspended', 'banned')
             ELSE TRUE
           END
  )
  SELECT jsonb_build_object(
    'total', (SELECT count(*) FROM filtered),
    'rows', COALESCE((
      SELECT jsonb_agg(f ORDER BY f.created_at DESC)
        FROM (SELECT * FROM filtered ORDER BY created_at DESC
               LIMIT LEAST(GREATEST(p_limit, 1), 100) OFFSET GREATEST(p_offset, 0)) f
    ), '[]'::JSONB)
  ) INTO v_out;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_user_status(p_user_id UUID, p_status public.user_status)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_user_id = public.current_app_user_id() THEN
    RAISE EXCEPTION 'You cannot change your own status' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('active', 'suspended') THEN
    RAISE EXCEPTION 'Unsupported status' USING ERRCODE = '22023';
  END IF;

  SELECT status::TEXT INTO v_old FROM users WHERE id = p_user_id;
  UPDATE users SET status = p_status, updated_at = NOW() WHERE id = p_user_id;

  PERFORM public.record_admin_action(
    'user.status', 'users', p_user_id::TEXT,
    jsonb_build_object('from', v_old, 'to', p_status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reports(p_status TEXT DEFAULT 'open')
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_out JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::JSONB) INTO v_out
    FROM (
      SELECT rp.id, rp.type, rp.reason, rp.description, rp.contact, rp.status, rp.created_at,
             jsonb_build_object('name', rep.full_name, 'avatar', rep.avatar_url, 'phone', rep.phone) AS reporter,
             CASE WHEN tgt.id IS NULL THEN NULL
                  ELSE jsonb_build_object('name', tgt.full_name, 'avatar', tgt.avatar_url, 'phone', tgt.phone) END AS reported,
             CASE WHEN b.id IS NULL THEN NULL
                  ELSE jsonb_build_object('reference', b.booking_reference, 'trip_id', t.id,
                                          'from', t.from_location, 'to', t.to_location,
                                          'departure_date', t.departure_date, 'total', b.total_price) END AS booking
        FROM reports rp
        JOIN users rep ON rep.id = rp.reporter_id
        LEFT JOIN users tgt ON tgt.id = rp.reported_user_id
        LEFT JOIN bookings b ON b.id = rp.booking_id
        LEFT JOIN trips t ON t.id = b.trip_id
       WHERE CASE p_status
               WHEN 'closed' THEN rp.status IN ('resolved', 'dismissed')
               ELSE rp.status = p_status
             END
       ORDER BY rp.created_at DESC
       LIMIT 100
    ) r;

  RETURN v_out;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_report_status(p_report_id UUID, p_status TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_old TEXT;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('open', 'reviewing', 'resolved', 'dismissed') THEN
    RAISE EXCEPTION 'Unsupported status' USING ERRCODE = '22023';
  END IF;

  SELECT status INTO v_old FROM reports WHERE id = p_report_id;
  UPDATE reports SET status = p_status WHERE id = p_report_id;

  PERFORM public.record_admin_action(
    'report.status', 'reports', p_report_id::TEXT,
    jsonb_build_object('from', v_old, 'to', p_status)
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_audit_log(p_action TEXT DEFAULT NULL, p_limit INTEGER DEFAULT 50)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_out JSONB;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admins only' USING ERRCODE = '42501';
  END IF;

  SELECT COALESCE(jsonb_agg(r ORDER BY r.created_at DESC), '[]'::JSONB) INTO v_out
    FROM (
      SELECT a.id, a.action, a.subject, a.subject_id, a.detail, a.created_at,
             u.full_name AS actor, u.avatar_url AS actor_avatar
        FROM admin_actions a
        LEFT JOIN users u ON u.id = a.actor_id
       WHERE p_action IS NULL OR a.action LIKE p_action || '%'
       ORDER BY a.created_at DESC
       LIMIT LEAST(GREATEST(p_limit, 1), 200)
    ) r;

  RETURN v_out;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_overview() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_trips(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_trip(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_payments(TEXT, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_users(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_user_status(UUID, public.user_status) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_reports(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_set_report_status(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.admin_audit_log(TEXT, INTEGER) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.admin_overview() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_trips(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_trip(UUID) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_payments(TEXT, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_users(TEXT, TEXT, INTEGER, INTEGER) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(UUID, public.user_status) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_reports(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_set_report_status(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.admin_audit_log(TEXT, INTEGER) TO authenticated, service_role;

COMMIT;
