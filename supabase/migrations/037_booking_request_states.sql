BEGIN;

ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'requested' BEFORE 'pending_payment';
ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rejected' AFTER 'cancelled';

COMMIT;
