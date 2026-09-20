-- One open check-in per child per service day (#482).
-- A child may have several attendance rows in a day after checkout; they
-- may not have two rows with check_out_at IS NULL.
--
-- Extra OPEN rows are deleted (earliest check_in_at kept) so the unique
-- index can be created. Checked-out historical rows are left alone.
-- Do not apply this to UAT or production from an agent session.

BEGIN;

DELETE FROM attendance a
WHERE a.check_out_at IS NULL
  AND a.attendance_id IN (
    SELECT attendance_id
    FROM (
      SELECT
        attendance_id,
        row_number() OVER (
          PARTITION BY child_id, date
          ORDER BY check_in_at ASC NULLS LAST, created_at ASC NULLS LAST, attendance_id ASC
        ) AS rn
      FROM attendance
      WHERE check_out_at IS NULL
        AND child_id IS NOT NULL
        AND date IS NOT NULL
    ) ranked
    WHERE rn > 1
  );

CREATE UNIQUE INDEX IF NOT EXISTS attendance_one_open_checkin_per_child_per_day
  ON attendance (child_id, date)
  WHERE check_out_at IS NULL;

COMMIT;
