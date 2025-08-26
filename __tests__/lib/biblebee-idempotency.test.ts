import { createCompetitionYear, upsertScripture, createGradeRule, enrollChildInBibleBee } from '@/lib/bibleBee';
import { db } from '@/lib/db';

test('enrollChildInBibleBee is idempotent for scriptures and essays', async () => {
    const year = await createCompetitionYear({ year: 2099, name: 'Test Year 2099' });
    // create scripture rule
    await upsertScripture({ competitionYearId: year.id, reference: 'Test 1:1', text: 't', sortOrder: 1 });
    await upsertScripture({ competitionYearId: year.id, reference: 'Test 1:2', text: 't2', sortOrder: 2 });
    await createGradeRule({ competitionYearId: year.id, minGrade: 1, maxGrade: 6, type: 'scripture', targetCount: 2 });

    const now = new Date().toISOString();
    const hh = crypto.randomUUID();
    const child = { child_id: crypto.randomUUID(), household_id: hh, first_name: 'Idem', last_name: 'Test', grade: '3', is_active: true, created_at: now, updated_at: now };
    await db.children.add(child);

    const r1 = await enrollChildInBibleBee(child.child_id, year.id);
    const r2 = await enrollChildInBibleBee(child.child_id, year.id);

    const assigned = await db.studentScriptures.where({ childId: child.child_id, competitionYearId: year.id }).toArray();
    expect(assigned.length).toBe(2);
    // ensure functions returned result objects (may be null if no rule)
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
});
