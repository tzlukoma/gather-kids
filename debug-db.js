// Debug script to check current database state
const { db } = require('./src/lib/db.ts');

async function debugDatabase() {
    console.log('=== DATABASE DEBUG ===');
    
    // Check Bible Bee years
    const bibleBeeYears = await db.bible_bee_years.toArray();
    console.log('Bible Bee Years:', bibleBeeYears.length);
    bibleBeeYears.forEach(y => console.log(`  ${y.id}: ${y.label} (active: ${y.is_active})`));
    
    // Check scriptures with new schema
    const scripturesNew = await db.scriptures.where('year_id').above('').toArray();
    console.log('Scriptures (new schema - year_id):', scripturesNew.length);
    
    // Check scriptures with old schema  
    const scripturesOld = await db.scriptures.where('competitionYearId').above('').toArray();
    console.log('Scriptures (old schema - competitionYearId):', scripturesOld.length);
    
    // Check registration cycles
    const cycles = await db.registration_cycles.toArray();
    console.log('Registration Cycles:', cycles.length);
    cycles.forEach(c => console.log(`  ${c.cycle_id}: ${c.label} (active: ${c.is_active})`));
    
    // Check ministries
    const ministries = await db.ministries.toArray();
    console.log('Ministries:', ministries.length);
    const bibleBee = ministries.find(m => m.code === 'bible-bee');
    if (bibleBee) {
        console.log('Bible Bee Ministry found:', bibleBee.ministry_id);
    } else {
        console.log('No Bible Bee ministry found!');
    }
    
    // Check ministry enrollments for Bible Bee
    if (bibleBee) {
        const enrollments = await db.ministry_enrollments
            .where('ministry_id')
            .equals(bibleBee.ministry_id)
            .toArray();
        console.log('Bible Bee Ministry Enrollments:', enrollments.length);
    }
    
    // Check children
    const children = await db.children.toArray();
    console.log('Children:', children.length);
}

debugDatabase().catch(console.error);