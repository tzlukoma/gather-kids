-- gatherKids production registration inventory
-- No names, emails, phones, addresses, medical notes, or photo URLs.
--
-- Supabase Dashboard → Production → SQL Editor → Run
-- Copy the single JSON cell and paste it back in chat.

WITH
cycle_stats AS (
  SELECT
    rc.cycle_id,
    rc.name,
    rc.is_active,
    rc.start_date,
    rc.end_date,
    rc.created_at,
    (SELECT count(*) FROM registrations r WHERE r.cycle_id = rc.cycle_id) AS registration_count,
    (SELECT count(*) FROM ministry_enrollments me WHERE me.cycle_id = rc.cycle_id) AS enrollment_count,
    (
      SELECT count(DISTINCT c.household_id)
      FROM registrations r
      JOIN children c ON c.child_id = r.child_id
      WHERE r.cycle_id = rc.cycle_id
        AND c.household_id IS NOT NULL
    ) AS household_count
  FROM registration_cycles rc
),
orphan_cycles AS (
  SELECT 'registrations'::text AS source, r.cycle_id, count(*) AS row_count
  FROM registrations r
  WHERE r.cycle_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM registration_cycles rc WHERE rc.cycle_id = r.cycle_id
    )
  GROUP BY r.cycle_id
  UNION ALL
  SELECT 'ministry_enrollments', me.cycle_id, count(*)
  FROM ministry_enrollments me
  WHERE me.cycle_id IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM registration_cycles rc WHERE rc.cycle_id = me.cycle_id
    )
  GROUP BY me.cycle_id
),
email_domains AS (
  SELECT
    lower(split_part(trim(email), '@', 2)) AS domain,
    count(*) AS n
  FROM guardians
  WHERE position('@' IN coalesce(email, '')) > 0
  GROUP BY lower(split_part(trim(email), '@', 2))
),
guardian_relationships AS (
  SELECT coalesce(nullif(trim(relationship), ''), '(blank)') AS rel, count(*) AS n
  FROM guardians
  GROUP BY coalesce(nullif(trim(relationship), ''), '(blank)')
),
duplicate_emails AS (
  SELECT lower(trim(email)) AS e, count(DISTINCT household_id) AS household_count
  FROM guardians
  WHERE nullif(trim(email), '') IS NOT NULL
  GROUP BY lower(trim(email))
  HAVING count(DISTINCT household_id) > 1
),
birth_years AS (
  SELECT substring(dob::text from 1 for 4) AS birth_year, count(*) AS n
  FROM children
  WHERE dob IS NOT NULL
    AND substring(dob::text from 1 for 4) ~ '^[0-9]{4}$'
  GROUP BY substring(dob::text from 1 for 4)
),
grades AS (
  SELECT coalesce(nullif(trim(grade), ''), '(blank)') AS grade, count(*) AS n
  FROM children
  GROUP BY coalesce(nullif(trim(grade), ''), '(blank)')
),
hh_child_counts AS (
  SELECT child_count, count(*) AS households
  FROM (
    SELECT h.household_id, count(c.child_id) AS child_count
    FROM households h
    LEFT JOIN children c ON c.household_id = h.household_id
    GROUP BY h.household_id
  ) x
  GROUP BY child_count
),
reg_by_cycle AS (
  SELECT
    coalesce(cycle_id, '(null)') AS cycle_id,
    count(*) AS n,
    count(*) FILTER (WHERE status = 'active') AS active,
    count(*) FILTER (WHERE pre_registered_sunday_school IS TRUE) AS sunday_school_prereg,
    count(*) FILTER (WHERE consents IS NOT NULL) AS has_consents,
    count(DISTINCT child_id) AS distinct_children
  FROM registrations
  GROUP BY cycle_id
),
reg_status AS (
  SELECT coalesce(status, '(null)') AS status, count(*) AS n
  FROM registrations
  GROUP BY status
),
reg_via AS (
  SELECT coalesce(submitted_via, '(null)') AS submitted_via, count(*) AS n
  FROM registrations
  GROUP BY submitted_via
),
consent_types AS (
  SELECT
    coalesce(elem->>'type', '(missing type)') AS consent_type,
    count(*) AS n,
    count(*) FILTER (WHERE nullif(elem->>'accepted_at', '') IS NOT NULL) AS accepted
  FROM registrations r
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE
      WHEN jsonb_typeof(r.consents) = 'array' THEN r.consents
      ELSE '[]'::jsonb
    END
  ) elem
  GROUP BY coalesce(elem->>'type', '(missing type)')
),
enroll_mix AS (
  SELECT
    coalesce(me.cycle_id, '(null)') AS cycle_id,
    coalesce(m.code, me.ministry_id, '(unknown)') AS ministry,
    m.name AS ministry_name,
    m.enrollment_type,
    me.status,
    count(*) AS n,
    count(*) FILTER (
      WHERE me.custom_fields IS NOT NULL AND me.custom_fields <> '{}'::jsonb
    ) AS has_custom_fields
  FROM ministry_enrollments me
  LEFT JOIN ministries m ON m.ministry_id = me.ministry_id
  GROUP BY me.cycle_id, m.code, me.ministry_id, m.name, m.enrollment_type, me.status
),
custom_keys AS (
  SELECT
    coalesce(m.code, me.ministry_id) AS ministry,
    keys.key,
    count(*) AS n
  FROM ministry_enrollments me
  LEFT JOIN ministries m ON m.ministry_id = me.ministry_id
  CROSS JOIN LATERAL jsonb_object_keys(
    CASE
      WHEN jsonb_typeof(me.custom_fields) = 'object' THEN me.custom_fields
      ELSE '{}'::jsonb
    END
  ) AS keys(key)
  GROUP BY coalesce(m.code, me.ministry_id), keys.key
),
ministry_rows AS (
  SELECT
    ministry_id,
    code,
    name,
    is_active,
    enrollment_type,
    min_age,
    max_age,
    data_profile,
    (custom_questions IS NOT NULL) AS has_custom_questions
  FROM ministries
),
bible_bee_stats AS (
  SELECT
    bbc.id,
    bbc.cycle_id,
    bbc.name,
    bbc.is_active,
    (SELECT count(*) FROM bible_bee_enrollments e WHERE e.bible_bee_cycle_id = bbc.id) AS enrollments
  FROM bible_bee_cycles bbc
),
sample_households AS (
  SELECT
    left(h.household_id, 8) AS household_id_prefix,
    (SELECT count(*) FROM guardians g WHERE g.household_id = h.household_id) AS guardian_count,
    (
      SELECT count(*) FILTER (WHERE nullif(trim(g.email), '') IS NOT NULL)
      FROM guardians g
      WHERE g.household_id = h.household_id
    ) AS guardian_emails,
    (SELECT count(*) FROM children c WHERE c.household_id = h.household_id) AS child_count,
    (
      SELECT count(*)
      FROM children c
      WHERE c.household_id = h.household_id
        AND c.is_active IS TRUE
    ) AS active_children,
    EXISTS (
      SELECT 1 FROM user_households uh WHERE uh.household_id = h.household_id
    ) AS has_auth_link,
    (
      SELECT coalesce(jsonb_agg(DISTINCT me.cycle_id), '[]'::jsonb)
      FROM children c
      JOIN ministry_enrollments me ON me.child_id = c.child_id
      WHERE c.household_id = h.household_id
        AND me.cycle_id IS NOT NULL
    ) AS enrollment_cycle_ids
  FROM households h
  ORDER BY h.created_at DESC NULLS LAST
  LIMIT 8
)
SELECT jsonb_pretty(
  jsonb_build_object(
    'generated_at', now(),
    'cycles', (
      SELECT coalesce(jsonb_agg(to_jsonb(c)), '[]'::jsonb)
      FROM (
        SELECT * FROM cycle_stats
        ORDER BY start_date, cycle_id
      ) c
    ),
    'orphan_cycle_ids', (
      SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
      FROM (
        SELECT * FROM orphan_cycles
        ORDER BY source, cycle_id
      ) o
    ),
    'row_counts', jsonb_build_object(
      'households', (SELECT count(*) FROM households),
      'guardians', (SELECT count(*) FROM guardians),
      'emergency_contacts', (SELECT count(*) FROM emergency_contacts),
      'children', (SELECT count(*) FROM children),
      'children_active', (SELECT count(*) FROM children WHERE is_active IS TRUE),
      'children_inactive', (SELECT count(*) FROM children WHERE is_active IS FALSE),
      'children_active_null', (SELECT count(*) FROM children WHERE is_active IS NULL),
      'registrations', (SELECT count(*) FROM registrations),
      'ministry_enrollments', (SELECT count(*) FROM ministry_enrollments),
      'user_households', (SELECT count(*) FROM user_households),
      'form_drafts', (SELECT count(*) FROM form_drafts),
      'avatars', (SELECT count(*) FROM avatars),
      'bible_bee_enrollments', (SELECT count(*) FROM bible_bee_enrollments),
      'attendance', (SELECT count(*) FROM attendance)
    ),
    'household_fill', (
      SELECT jsonb_build_object(
        'total', count(*),
        'has_name', count(*) FILTER (
          WHERE coalesce(nullif(trim(name), ''), nullif(trim(household_name), '')) IS NOT NULL
        ),
        'has_address_line1', count(*) FILTER (WHERE nullif(trim(address_line1), '') IS NOT NULL),
        'has_city', count(*) FILTER (WHERE nullif(trim(city), '') IS NOT NULL),
        'has_state', count(*) FILTER (WHERE nullif(trim(state), '') IS NOT NULL),
        'has_zip', count(*) FILTER (WHERE nullif(trim(zip), '') IS NOT NULL),
        'has_household_email', count(*) FILTER (WHERE nullif(trim(email), '') IS NOT NULL),
        'has_primary_phone', count(*) FILTER (WHERE nullif(trim(primary_phone), '') IS NOT NULL),
        'has_scripture_snake', count(*) FILTER (
          WHERE nullif(trim(preferred_scripture_translation), '') IS NOT NULL
        ),
        'has_scripture_camel', count(*) FILTER (
          WHERE nullif(trim("preferredScriptureTranslation"), '') IS NOT NULL
        ),
        'linked_to_auth_user', (SELECT count(DISTINCT household_id) FROM user_households)
      )
      FROM households
    ),
    'guardian_fill', jsonb_build_object(
      'total', (SELECT count(*) FROM guardians),
      'has_email', (SELECT count(*) FROM guardians WHERE nullif(trim(email), '') IS NOT NULL),
      'has_phone', (SELECT count(*) FROM guardians WHERE nullif(trim(mobile_phone), '') IS NOT NULL),
      'is_primary_true', (SELECT count(*) FROM guardians WHERE is_primary IS TRUE),
      'households_with_any_email', (
        SELECT count(DISTINCT household_id)
        FROM guardians
        WHERE household_id IS NOT NULL
          AND nullif(trim(email), '') IS NOT NULL
      ),
      'households_with_no_guardian', (
        SELECT count(*)
        FROM households h
        WHERE NOT EXISTS (
          SELECT 1 FROM guardians g WHERE g.household_id = h.household_id
        )
      ),
      'households_with_no_email', (
        SELECT count(*)
        FROM households h
        WHERE NOT EXISTS (
          SELECT 1
          FROM guardians g
          WHERE g.household_id = h.household_id
            AND nullif(trim(g.email), '') IS NOT NULL
        )
      ),
      'emails_on_multiple_households', (SELECT count(*) FROM duplicate_emails),
      'email_domains', (
        SELECT coalesce(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
        FROM (
          SELECT * FROM email_domains
          ORDER BY n DESC
          LIMIT 15
        ) d
      ),
      'relationships', (
        SELECT coalesce(jsonb_object_agg(rel, n), '{}'::jsonb)
        FROM guardian_relationships
      )
    ),
    'emergency_contact_fill', (
      SELECT jsonb_build_object(
        'total', count(*),
        'households_with_any', count(DISTINCT household_id),
        'has_phone', count(*) FILTER (WHERE nullif(trim(mobile_phone), '') IS NOT NULL)
      )
      FROM emergency_contacts
    ),
    'child_fill', jsonb_build_object(
      'total', (SELECT count(*) FROM children),
      'has_dob', (SELECT count(*) FROM children WHERE dob IS NOT NULL),
      'has_grade', (SELECT count(*) FROM children WHERE nullif(trim(grade), '') IS NOT NULL),
      'has_allergies', (SELECT count(*) FROM children WHERE nullif(trim(allergies), '') IS NOT NULL),
      'has_medical_notes', (SELECT count(*) FROM children WHERE nullif(trim(medical_notes), '') IS NOT NULL),
      'special_needs_true', (SELECT count(*) FROM children WHERE special_needs IS TRUE),
      'has_child_mobile', (SELECT count(*) FROM children WHERE nullif(trim(child_mobile), '') IS NOT NULL),
      'has_gender', (SELECT count(*) FROM children WHERE nullif(trim(gender), '') IS NOT NULL),
      'missing_household_id', (SELECT count(*) FROM children WHERE household_id IS NULL),
      'birth_year_counts', (
        SELECT coalesce(jsonb_object_agg(birth_year, n), '{}'::jsonb)
        FROM birth_years
      ),
      'grades', (
        SELECT coalesce(jsonb_object_agg(grade, n), '{}'::jsonb)
        FROM grades
      ),
      'children_per_household', (
        SELECT coalesce(jsonb_object_agg(child_count::text, households), '{}'::jsonb)
        FROM hh_child_counts
      )
    ),
    'registrations_by_cycle', (
      SELECT coalesce(jsonb_agg(to_jsonb(x)), '[]'::jsonb)
      FROM (
        SELECT * FROM reg_by_cycle
        ORDER BY n DESC
      ) x
    ),
    'registration_status', (
      SELECT coalesce(jsonb_object_agg(status, n), '{}'::jsonb)
      FROM reg_status
    ),
    'registration_submitted_via', (
      SELECT coalesce(jsonb_object_agg(submitted_via, n), '{}'::jsonb)
      FROM reg_via
    ),
    'consent_types', (
      SELECT coalesce(jsonb_agg(to_jsonb(t)), '[]'::jsonb)
      FROM (
        SELECT * FROM consent_types
        ORDER BY n DESC
      ) t
    ),
    'enrollments_by_cycle_ministry', (
      SELECT coalesce(jsonb_agg(to_jsonb(e)), '[]'::jsonb)
      FROM (
        SELECT * FROM enroll_mix
        ORDER BY cycle_id, n DESC
      ) e
    ),
    'custom_field_keys', (
      SELECT coalesce(jsonb_agg(to_jsonb(k)), '[]'::jsonb)
      FROM (
        SELECT * FROM custom_keys
        ORDER BY n DESC
      ) k
    ),
    'ministries', (
      SELECT coalesce(jsonb_agg(to_jsonb(m)), '[]'::jsonb)
      FROM (
        SELECT * FROM ministry_rows
        ORDER BY name
      ) m
    ),
    'bible_bee', jsonb_build_object(
      'cycles', (
        SELECT coalesce(jsonb_agg(to_jsonb(b)), '[]'::jsonb)
        FROM (
          SELECT * FROM bible_bee_stats
          ORDER BY name
        ) b
      )
    ),
    'auth_linkage', jsonb_build_object(
      'households_linked', (SELECT count(DISTINCT household_id) FROM user_households),
      'auth_users_linked', (SELECT count(DISTINCT auth_user_id) FROM user_households),
      'households_with_children_but_no_auth', (
        SELECT count(DISTINCT c.household_id)
        FROM children c
        WHERE c.household_id IS NOT NULL
          AND NOT EXISTS (
            SELECT 1 FROM user_households uh WHERE uh.household_id = c.household_id
          )
      )
    ),
    'attendance_span', (
      SELECT jsonb_build_object(
        'rows', count(*),
        'min_date', min(date),
        'max_date', max(date)
      )
      FROM attendance
    ),
    'redacted_samples', (
      SELECT coalesce(jsonb_agg(to_jsonb(s)), '[]'::jsonb)
      FROM sample_households s
    )
  )
) AS inventory;
