import { db } from './db';
import { createCompetitionYear, upsertScripture, createGradeRule, enrollChildInBibleBee } from './bibleBee';

export async function seedBibleBeeDemo() {
    const now = new Date().toISOString();
    // Create 2024 and 2025
    const y2024 = await createCompetitionYear({ year: 2024, name: 'Bible Bee 2024', description: 'Demo year 2024' });
    const y2025 = await createCompetitionYear({ year: 2025, name: 'Bible Bee 2025', description: 'Demo year 2025' });

    // seed ~10 scriptures each for brevity
    for (let i = 1; i <= 10; i++) {
        await upsertScripture({ competitionYearId: y2024.id, reference: `Psalm ${i}:1`, text: `Sample scripture ${i} for 2024`, sortOrder: i });
        await upsertScripture({ competitionYearId: y2025.id, reference: `John ${i}:1`, text: `Sample scripture ${i} for 2025`, sortOrder: i });
    }

    // grade rules
    await createGradeRule({ competitionYearId: y2025.id, minGrade: 1, maxGrade: 6, type: 'scripture', targetCount: 20 });
    await createGradeRule({ competitionYearId: y2025.id, minGrade: 7, maxGrade: 12, type: 'essay', promptText: 'Explain the central theme of Ephesians 2', instructions: '500 words' });

    // seed a couple of households/children if none exist
    const households = await db.households.toArray();
    if (households.length === 0) {
        const hhId = crypto.randomUUID();
        await db.households.add({ household_id: hhId, name: 'Seed Family', created_at: now, updated_at: now });
        const childA = { child_id: crypto.randomUUID(), household_id: hhId, first_name: 'Alice', last_name: 'Seed', grade: '3', is_active: true, created_at: now, updated_at: now };
        const childB = { child_id: crypto.randomUUID(), household_id: hhId, first_name: 'Bob', last_name: 'Seed', grade: '8', is_active: true, created_at: now, updated_at: now };
        await db.children.bulkAdd([childA, childB]);

        // enroll both in 2025
        await enrollChildInBibleBee(childA.child_id, y2025.id);
        await enrollChildInBibleBee(childB.child_id, y2025.id);
    }
}
