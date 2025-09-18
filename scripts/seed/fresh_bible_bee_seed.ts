import { db } from '../../src/lib/db';
import { dbAdapter } from '../../src/lib/database/supabase-adapter';
import { shouldUseAdapter } from '../../src/lib/dal';

/**
 * Fresh Bible Bee Seeding Script
 * Creates Bible Bee data using the new canonical schema
 */

const EXTERNAL_ID_PREFIX = 'seed_';

async function createBibleBeeCycle(registrationCycleId: string) {
    console.log(`📖 Creating Bible Bee cycle for registration cycle: ${registrationCycleId}`);
    
    const cycleData = {
        cycle_id: registrationCycleId,
        name: 'Fall 2025 Bible Bee',
        description: 'Fall 2025 Bible Bee competition cycle',
        is_active: true,
    };

    if (shouldUseAdapter()) {
        // Use Supabase adapter
        const cycle = await dbAdapter.createBibleBeeCycle(cycleData);
        console.log(`✅ Created Bible Bee cycle: ${cycle.id}`);
        return cycle.id;
    } else {
        // Use Dexie
        const cycle = await db.bible_bee_cycles.add({
            ...cycleData,
            id: `${EXTERNAL_ID_PREFIX}bible_bee_cycle_${Date.now()}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        });
        console.log(`✅ Created Bible Bee cycle: ${cycle}`);
        return cycle;
    }
}

async function createDivisions(bibleBeeCycleId: string) {
    console.log(`🏆 Creating divisions for Bible Bee cycle: ${bibleBeeCycleId}`);
    
    const divisions = [
        {
            name: 'Primary',
            description: 'Kindergarten - 2nd Grade',
            minimum_required: 5,
            min_grade: 0,
            max_grade: 2,
            requires_essay: false,
        },
        {
            name: 'Elementary',
            description: '3rd - 5th Grade',
            minimum_required: 10,
            min_grade: 3,
            max_grade: 5,
            requires_essay: false,
        },
        {
            name: 'Middle School',
            description: '6th - 8th Grade',
            minimum_required: 15,
            min_grade: 6,
            max_grade: 8,
            requires_essay: true,
        },
        {
            name: 'High School',
            description: '9th - 12th Grade',
            minimum_required: 20,
            min_grade: 9,
            max_grade: 12,
            requires_essay: true,
        },
    ];

    const createdDivisions = [];
    
    for (const division of divisions) {
        const divisionData = {
            bible_bee_cycle_id: bibleBeeCycleId,
            ...division,
        };

        if (shouldUseAdapter()) {
            const created = await dbAdapter.createDivision(divisionData);
            createdDivisions.push(created);
        } else {
            const id = `${EXTERNAL_ID_PREFIX}division_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.divisions.add({
                ...divisionData,
                id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            createdDivisions.push({ id, ...divisionData });
        }
    }

    console.log(`✅ Created ${createdDivisions.length} divisions`);
    return createdDivisions;
}

async function createScriptures(bibleBeeCycleId: string) {
    console.log(`📜 Creating scriptures for Bible Bee cycle: ${bibleBeeCycleId}`);
    
    const scriptures = [
        {
            reference: 'Philippians 4:4-5',
            texts: {
                NIV: '<sup>4</sup> Rejoice in the Lord always. I will say it again: Rejoice! <sup>5</sup> Let your gentleness be evident to all. The Lord is near.',
                KJV: '<sup>4</sup> Rejoice in the Lord alway: and again I say, Rejoice. <sup>5</sup> Let your moderation be known unto all men. The Lord is at hand.',
                NVI: '<sup>4</sup> Alégrense siempre en el Señor. Insisto: ¡Alégrense! <sup>5</sup> Que su amabilidad sea evidente a todos. El Señor está cerca.',
            },
            scripture_number: '1-2',
            scripture_order: 1,
            counts_for: 2,
            category: 'Primary Minimum',
        },
        {
            reference: 'John 3:16',
            texts: {
                NIV: '<sup>16</sup> For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
                KJV: '<sup>16</sup> For God so loved the world, that he gave his only begotten Son, that whosoever believeth in him should not perish, but have everlasting life.',
                NVI: '<sup>16</sup> Porque tanto amó Dios al mundo que dio a su Hijo unigénito, para que todo el que cree en él no se pierda, sino que tenga vida eterna.',
            },
            scripture_number: '3',
            scripture_order: 2,
            counts_for: 1,
            category: 'Primary Minimum',
        },
        {
            reference: 'Romans 8:28',
            texts: {
                NIV: '<sup>28</sup> And we know that in all things God works for the good of those who love him, who have been called according to his purpose.',
                KJV: '<sup>28</sup> And we know that all things work together for good to them that love God, to them who are the called according to his purpose.',
                NVI: '<sup>28</sup> Ahora bien, sabemos que Dios dispone todas las cosas para el bien de quienes lo aman, los que han sido llamados de acuerdo con su propósito.',
            },
            scripture_number: '4',
            scripture_order: 3,
            counts_for: 1,
            category: 'Elementary Minimum',
        },
        {
            reference: 'Jeremiah 29:11',
            texts: {
                NIV: '<sup>11</sup> For I know the plans I have for you," declares the Lord, "plans to prosper you and not to harm you, plans to give you hope and a future.',
                KJV: '<sup>11</sup> For I know the thoughts that I think toward you, saith the Lord, thoughts of peace, and not of evil, to give you an expected end.',
                NVI: '<sup>11</sup> Porque yo sé muy bien los planes que tengo para ustedes —afirma el Señor—, planes de bienestar y no de calamidad, a fin de darles un futuro y una esperanza.',
            },
            scripture_number: '5',
            scripture_order: 4,
            counts_for: 1,
            category: 'Elementary Minimum',
        },
        {
            reference: 'Proverbs 3:5-6',
            texts: {
                NIV: '<sup>5</sup> Trust in the Lord with all your heart and lean not on your own understanding; <sup>6</sup> in all your ways submit to him, and he will make your paths straight.',
                KJV: '<sup>5</sup> Trust in the Lord with all thine heart; and lean not unto thine own understanding. <sup>6</sup> In all thy ways acknowledge him, and he shall direct thy paths.',
                NVI: '<sup>5</sup> Confía en el Señor de todo corazón, y no en tu propia inteligencia. <sup>6</sup> Reconócelo en todos tus caminos, y él allanará tus sendas.',
            },
            scripture_number: '6-7',
            scripture_order: 5,
            counts_for: 2,
            category: 'Middle School Minimum',
        },
    ];

    const createdScriptures = [];
    
    for (const scripture of scriptures) {
        const scriptureData = {
            bible_bee_cycle_id: bibleBeeCycleId,
            ...scripture,
        };

        if (shouldUseAdapter()) {
            const created = await dbAdapter.upsertScripture(scriptureData);
            createdScriptures.push(created);
        } else {
            const id = `${EXTERNAL_ID_PREFIX}scripture_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            await db.scriptures.add({
                ...scriptureData,
                id,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });
            createdScriptures.push({ id, ...scriptureData });
        }
    }

    console.log(`✅ Created ${createdScriptures.length} scriptures`);
    return createdScriptures;
}

async function createEssayPrompts(bibleBeeCycleId: string, divisions: any[]) {
    console.log(`✍️ Creating essay prompts for Bible Bee cycle: ${bibleBeeCycleId}`);
    
    const essayPrompts = [
        {
            title: 'Faith in Action',
            prompt: 'Write about a time when your faith influenced a decision you made or an action you took.',
            instructions: 'Your essay should be 200-300 words and include specific examples.',
            due_date: new Date('2025-12-15').toISOString(),
        },
        {
            title: 'God\'s Love',
            prompt: 'Describe how you have experienced God\'s love in your life.',
            instructions: 'Your essay should be 150-250 words and be personal and reflective.',
            due_date: new Date('2025-12-15').toISOString(),
        },
    ];

    const createdPrompts = [];
    
    for (let i = 0; i < essayPrompts.length; i++) {
        const prompt = essayPrompts[i];
        const division = divisions[i + 2]; // Assign to Middle School and High School divisions
        
        if (division) {
            const promptData = {
                bible_bee_cycle_id: bibleBeeCycleId,
                division_id: division.id,
                ...prompt,
            };

            if (shouldUseAdapter()) {
                const created = await dbAdapter.createEssayPrompt(promptData);
                createdPrompts.push(created);
            } else {
                const id = `${EXTERNAL_ID_PREFIX}essay_prompt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                await db.essay_prompts.add({
                    ...promptData,
                    id,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                });
                createdPrompts.push({ id, ...promptData });
            }
        }
    }

    console.log(`✅ Created ${createdPrompts.length} essay prompts`);
    return createdPrompts;
}

export async function seedBibleBeeFresh(registrationCycleId?: string) {
    try {
        console.log('🌱 Starting fresh Bible Bee seeding...');
        
        // Use provided registration cycle ID or find an active one
        let cycleId = registrationCycleId;
        if (!cycleId) {
            if (shouldUseAdapter()) {
                const cycles = await dbAdapter.listRegistrationCycles(true);
                if (cycles.length > 0) {
                    cycleId = cycles[0].cycle_id;
                }
            } else {
                const cycles = await db.registration_cycles.where('is_active').equals(true).toArray();
                if (cycles.length > 0) {
                    cycleId = cycles[0].cycle_id;
                }
            }
        }

        if (!cycleId) {
            throw new Error('No active registration cycle found. Please create one first.');
        }

        console.log(`📋 Using registration cycle: ${cycleId}`);

        // Step 1: Create Bible Bee cycle
        const bibleBeeCycleId = await createBibleBeeCycle(cycleId);

        // Step 2: Create divisions
        const divisions = await createDivisions(bibleBeeCycleId);

        // Step 3: Create scriptures
        const scriptures = await createScriptures(bibleBeeCycleId);

        // Step 4: Create essay prompts
        const essayPrompts = await createEssayPrompts(bibleBeeCycleId, divisions);

        console.log('✅ Fresh Bible Bee seeding completed successfully!');
        console.log(`📊 Created:`);
        console.log(`   - 1 Bible Bee cycle`);
        console.log(`   - ${divisions.length} divisions`);
        console.log(`   - ${scriptures.length} scriptures`);
        console.log(`   - ${essayPrompts.length} essay prompts`);

        return {
            bibleBeeCycleId,
            divisions,
            scriptures,
            essayPrompts,
        };

    } catch (error) {
        console.error('❌ Fresh Bible Bee seeding failed:', error);
        throw error;
    }
}

// Allow running this script directly
if (require.main === module) {
    seedBibleBeeFresh()
        .then(() => {
            console.log('🎉 Seeding completed!');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Seeding failed:', error);
            process.exit(1);
        });
}
