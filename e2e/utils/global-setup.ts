import { FullConfig } from '@playwright/test';
import { seedMinistries } from './seed';

async function globalSetup(config: FullConfig) {
  console.log('🌱 Setting up E2E test environment...');
  
  try {
    // Seed required test data
    await seedMinistries();
    console.log('✅ Database seeding completed');
  } catch (error) {
    console.error('❌ Database seeding failed:', error);
    throw error;
  }
}

export default globalSetup;