// Test script to isolate ministry creation issue
import { createMinistry } from '../src/lib/dal.js';

async function testMinistryCreation() {
    console.log('Testing ministry creation...');
    
    const testMinistryData = {
        name: 'Test Ministry',
        code: 'test-ministry',
        enrollment_type: 'enrolled',
        is_active: true,
        description: 'A test ministry for debugging',
    };
    
    try {
        const ministryId = await createMinistry(testMinistryData);
        console.log('Ministry created successfully:', ministryId);
    } catch (error) {
        console.error('Error creating ministry:', error);
        console.error('Error details:', error.message);
    }
}

testMinistryCreation().catch(console.error);