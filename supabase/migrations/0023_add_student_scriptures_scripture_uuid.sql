BEGIN;

-- 1) Add a new uuid column (nullable for safety)
ALTER TABLE student_scriptures
  ADD COLUMN IF NOT EXISTS scripture_id_uuid uuid;

-- 2) Populate it from scriptures.external_id -> scriptures.id
UPDATE student_scriptures s
SET scripture_id_uuid = p.id
FROM scriptures p
WHERE s.scripture_id = p.external_id;

-- 3) Manual check recommended BEFORE adding the FK:
--    SELECT count(*) FROM student_scriptures WHERE scripture_id_uuid IS NULL AND scripture_id IS NOT NULL;
-- If that returns 0, it's safe to add the FK constraint below.

-- 4) Add the FK constraint referencing scriptures(id) if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'fk_student_scriptures_scripture' 
    AND conrelid = 'student_scriptures'::regclass
  ) THEN
    ALTER TABLE student_scriptures
      ADD CONSTRAINT fk_student_scriptures_scripture
      FOREIGN KEY (scripture_id_uuid) REFERENCES scriptures(id);
  ELSE
    RAISE NOTICE 'Constraint fk_student_scriptures_scripture already exists, skipping.';
  END IF;
END
$$;

COMMIT;
