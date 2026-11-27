-- 093: shorter notification wording.
--
-- Text only, no logic. Each row below swaps one piece of a function's text.
-- The migration stops if a piece is missing or appears more than once, so
-- nothing changes silently. complete_trip is not here: 092 rewrites it with
-- the short wording.

DO $mig$
DECLARE
  r      RECORD;
  v_oid  OID;
  v_def  TEXT;
  v_hits INTEGER;
BEGIN
  FOR r IN
    SELECT * FROM (VALUES
      -- Seat requests and answers
      ('request_seat', $o$'New seat request',$o$, $n$'Seat request',$n$),
      ('request_seat', $o$'. Accept to hold the seat and ask for payment.',$o$, $n$'.',$n$),
      ('accept_booking', $o$'Your seat is held',$o$, $n$'Seat held',$n$),
      ('accept_booking',
$o$COALESCE(v_who, 'Your driver') || ' accepted your request for ' ||
      v_trip.from_location || ' to ' || v_trip.to_location ||
      '. Pay within ' || p_hold_mins || ' minutes to confirm it.',$o$,
$n$COALESCE(v_who, 'Your driver') || ' accepted. Pay within ' || p_hold_mins || ' min.',$n$),
      ('decline_booking', $o$'That seat was not available',$o$, $n$'Request declined',$n$),
      ('decline_booking', $o$'Your request for ' || COALESCE(v_trip.from_location, 'that ride') ||$o$,
                          $n$COALESCE(v_trip.from_location, 'That ride') ||$n$),
      ('decline_booking', $o$' was declined. ' ||$o$, $n$'. ' ||$n$),
      ('decline_booking', $o$'Nothing was charged. Other rides on this route are still open.',$o$,
                          $n$'Nothing was charged.',$n$),
      ('expire_departed_trips',
$o$' left before your request was answered. Nothing was charged. ' ||
             'Other rides on this route are still open.',$o$,
$n$'. Nothing was charged.',$n$),

      -- Holds, payments and refunds
      ('pay_booking_with_wallet', $o$'Payment held securely',$o$, $n$'Seat confirmed',$n$),
      ('pay_booking_with_wallet', $o$' from your Kipita wallet is held until your ride ends.',$o$,
                                  $n$' held until your ride ends.',$n$),
      ('pay_booking_with_wallet', $o$'A passenger paid for their seat. The fare is held until the ride ends.',$o$,
                                  $n$'Fare held until the ride ends.',$n$),
      ('notify_booking_cancelled', $o$'Your seat hold ran out',$o$, $n$'Hold expired',$n$),
      ('notify_booking_cancelled', $o$v_route || ' was not paid in time, so the seat was released. Nothing was charged.',$o$,
                                   $n$v_route || '. Nothing was charged.',$n$),
      ('notify_booking_cancelled', $o$v_name || ' didn''t pay in time',$o$, $n$v_name || ' didn''t pay',$n$),
      ('notify_booking_cancelled', $o$'The ' || CASE WHEN NEW.seats_booked = 1 THEN 'seat' ELSE 'seats' END ||$o$,
                                   $n$CASE WHEN NEW.seats_booked = 1 THEN 'Seat' ELSE 'Seats' END ||$n$),
      ('notify_booking_cancelled', $o$' on ' || v_route || ' are back on sale.',$o$,
                                   $n$' back on sale · ' || v_route,$n$),
      ('notify_booking_cancelled', $o$THEN ' seat is' ELSE ' seats are' END ||$o$,
                                   $n$THEN ' seat' ELSE ' seats' END ||$n$),
      ('refund_booking_payment', $o$'Refunded to your wallet',$o$, $n$'Refunded',$n$),
      ('refund_booking_payment', $o$'Your fare is back in your Kipita wallet in full. You can book another ride now.',$o$,
                                 $n$'Full fare back in your wallet.',$n$),
      ('refund_late_payment', $o$'Payment refunded to your wallet',$o$, $n$'Refunded',$n$),
      ('refund_late_payment', $o$'Your hold had ended before you paid. KES '$o$, $n$'Hold expired. KES '$n$),
      ('refund_late_payment', $o$' is back in your wallet.',$o$, $n$' back in your wallet.',$n$),
      ('release_booking_payment', $o$'Fare released',$o$, $n$'Fare paid',$n$),
      ('release_booking_payment', $o$' was added to your Kipita wallet. Paid out to M-Pesa each morning.',$o$,
                                  $n$' added to your wallet.',$n$),
      ('convert_referral', $o$'Referral Paid',$o$, $n$'Referral paid',$n$),
      ('convert_referral', $o$' added to your wallet — your invite took their first ride.'$o$,
                           $n$' added to your wallet.'$n$),

      -- Reminders
      ('send_booking_reminders', $o$'10 minutes left to pay',$o$, $n$'10 min left to pay',$n$),
      ('send_booking_reminders', $o$'. Pay now or the seat goes back on sale.',$o$, $n$'. Pay to keep your seat.',$n$),
      ('send_booking_reminders', $o$THEN '. Your passenger has paid and is waiting.'$o$,
                                 $n$THEN '. Passenger has paid.'$n$),
      ('send_booking_reminders', $o$ELSE '. Be at the pickup a few minutes early.'$o$,
                                 $n$ELSE '. Be on time.'$n$),
      ('send_cancel_window_reminders', $o$'Free cancellation ends in about an hour',$o$,
                                       $n$'Free cancellation ends in 1 hour',$n$),
      ('send_cancel_window_reminders', $o$'. After that, cancelling returns ' || v_late_pc::INTEGER || '% of the seat price.',$o$,
                                       $n$'. After that you get ' || v_late_pc::INTEGER || '% back.',$n$),

      -- Cancellations and no-shows
      ('cancel_trip', $o$'Your ride was cancelled',$o$, $n$'Ride cancelled',$n$),
      ('record_driver_cancellation', $o$'You have cancelled paid rides at short notice ' || v_late_count$o$,
                                     $n$v_late_count$n$),
      ('record_driver_cancellation',
$o$|| ' times in the last 30 days. Passengers rely on these rides, and repeated late cancellations can lead to your account being paused.',$o$,
$n$|| ' late cancellations in 30 days. More can pause your account.',$n$),
      ('settle_cancellation',
$o$' is back in your Kipita wallet. The rest of the seat price goes to your driver and the service fee is not refunded, because the ride was less than '$o$,
$n$' back in your wallet. Cancelled less than '$n$),
      ('settle_cancellation', $o$|| v_free::INTEGER || ' hours away.'$o$, $n$|| v_free::INTEGER || ' hours before the ride.'$n$),
      ('settle_cancellation', $o$ELSE 'Because the ride was less than ' || v_free::INTEGER$o$,
                              $n$ELSE 'Cancelled less than ' || v_free::INTEGER$n$),
      ('settle_cancellation', $o$|| ' hours away, the seat price went to your driver.' END,$o$,
                              $n$|| ' hours before the ride. No refund.' END,$n$),
      ('settle_cancellation', $o$'A passenger cancelled less than ' || v_free::INTEGER || ' hours before the ride. KES ' || trim_scale(v_drv)$o$,
                              $n$'KES ' || trim_scale(v_drv)$n$),
      ('settle_cancellation', $o$|| ' was added to your Kipita wallet.',$o$, $n$|| ' added to your wallet.',$n$),
      ('mark_no_show', $o$'Your driver says you didn''t show up',$o$, $n$'Marked as no-show',$n$),
      ('mark_no_show', $o$'Not right? Tell us within ' || v_hours::INTEGER || ' hours, or your fare goes to the driver.',$o$,
                       $n$'Dispute within ' || v_hours::INTEGER || ' hours, or the driver is paid.',$n$),
      ('dispute_no_show', $o$'A passenger disputes a no-show report. The fare is on hold until you decide.',$o$,
                          $n$'Passenger disputes a no-show. Fare on hold.',$n$),
      ('dispute_no_show', $o$'We are looking into it',$o$, $n$'Dispute received',$n$),
      ('dispute_no_show', $o$'Your fare stays on hold while we review this. We will tell you what we decide.',$o$,
                          $n$'Fare on hold while we review.',$n$),
      ('dispute_no_show', $o$'The passenger disputes the no-show report. The fare stays on hold while we review it.',$o$,
                          $n$'Passenger disputes it. Fare on hold.',$n$),
      ('resolve_no_show', $o$'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',$o$,
                          $n$'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' added to your wallet.',$n$),
      ('resolve_no_show', $o$'We reviewed your dispute',$o$, $n$'Dispute not upheld',$n$),
      ('resolve_no_show', $o$'We could not confirm you were at the pickup, so your fare stays with the driver.',$o$,
                          $n$'Fare stays with the driver.',$n$),
      ('resolve_no_show', $o$'We reviewed the no-show report and refunded the passenger.',$o$,
                          $n$'Passenger refunded.',$n$),
      ('settle_no_shows', $o$'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' was added to your Kipita wallet.',$o$,
                          $n$'KES ' || trim_scale((v_terms->>'driver_gets')::NUMERIC) || ' added to your wallet.',$n$),
      ('settle_no_shows', $o$'Your fare went to the driver',$o$, $n$'Fare went to your driver',$n$),
      ('settle_no_shows', $o$'You did not dispute the no-show report in time, so the seat price went to your driver.',$o$,
                          $n$'You didn''t dispute in time.',$n$),

      -- Ride start and problems
      ('start_trip', $o$'Your ride has started',$o$, $n$'Ride started',$n$),
      ('start_trip', $o$' is under way. Something wrong? Report a problem on your booking.',$o$, $n$'.',$n$),
      ('start_trip', $o$' started before your seat was paid for, so it was released. ' ||$o$, $n$'. ' ||$n$),
      ('mark_boarded_manually', $o$'You were marked on board',$o$, $n$'Marked on board',$n$),
      ('mark_boarded_manually', $o$'Your driver did it without your code. Not right? Report a problem on your booking.',$o$,
                                $n$'Done without your code. Not right? Report a problem.',$n$),
      ('report_problem', $o$'We are looking into it',$o$, $n$'Report received',$n$),
      ('report_problem', $o$'Your fare is on hold. We will tell you what we decide.',$o$,
                         $n$'Fare on hold while we review.',$n$),
      ('report_problem', $o$'A problem was reported',$o$, $n$'Problem reported',$n$),
      ('report_problem', $o$'The fare is on hold while we review it.',$o$,
                         $n$'Fare on hold while we review.',$n$),
      ('resolve_booking_problem', $o$'A report was upheld',$o$, $n$'Report upheld',$n$),
      ('resolve_booking_problem', $o$'The fare was refunded to the passenger.',$o$, $n$'Passenger refunded.',$n$),
      ('resolve_booking_problem', $o$'We looked into your report',$o$, $n$'Report reviewed',$n$),
      ('resolve_booking_problem', $o$'We found no problem, so the fare goes to your driver. Disagree? Contact support.',$o$,
                                  $n$'No problem found. Disagree? Contact support.',$n$),

      -- Posted rides, verification, milestones
      ('notify_driver_trip_posted', $o$WHEN v_waiting THEN 'it goes live as soon as verification clears'$o$,
                                   $n$WHEN v_waiting THEN 'live once you''re verified'$n$),
      ('notify_driver_trip_posted', $o$ELSE 'passengers can book a seat now'$o$, $n$ELSE 'open for booking'$n$),
      ('set_driver_approval', $o$'You are verified'$o$, $n$'You''re verified'$n$),
      ('set_driver_approval', $o$'Driver verification update'$o$, $n$'Verification update'$n$),
      ('set_driver_approval', $o$'Your details check out, and your saved ride is now live.'$o$,
                              $n$'Your ride is live.'$n$),
      ('set_driver_approval', $o$'Your details check out, and your ' || v_live || ' saved rides are now live.'$o$,
                              $n$v_live || ' rides are live.'$n$),
      ('set_driver_approval', $o$'Your details check out. You can publish rides now.'$o$,
                              $n$'You can publish rides now.'$n$),
      ('set_driver_approval', $o$'We could not verify your details. Open Kipita to send them again.'$o$,
                              $n$'Couldn''t verify you. Send your details again.'$n$),
      ('notify_trip_milestone', $o$THEN 'Every seat you share puts a car''s empty space to work.'$o$,
                                $n$THEN 'Thanks for sharing your seats.'$n$),
      ('notify_trip_milestone', $o$ELSE 'Every shared seat is one less car on the road.'$o$,
                                $n$ELSE 'Thanks for sharing the ride.'$n$)
    ) AS t(fn, old_text, new_text)
  LOOP
    SELECT p.oid INTO STRICT v_oid
      FROM pg_proc p
     WHERE p.pronamespace = 'public'::regnamespace AND p.proname = r.fn;

    v_def  := pg_get_functiondef(v_oid);
    v_hits := (length(v_def) - length(replace(v_def, r.old_text, ''))) / length(r.old_text);
    IF v_hits <> 1 THEN
      RAISE EXCEPTION 'Notification text in % found % times: %', r.fn, v_hits, r.old_text;
    END IF;

    EXECUTE replace(v_def, r.old_text, r.new_text);
  END LOOP;
END
$mig$;
