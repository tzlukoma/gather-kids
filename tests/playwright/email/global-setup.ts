import { FullConfig } from '@playwright/test';
import { MailHogHelper } from '../utils/mailhog';

async function globalSetup(config: FullConfig) {
  console.log('Setting up email verification test environment...');
  
  const mailhog = new MailHogHelper();
  
  try {
    // Wait for MailHog to be available
    await mailhog.waitForMailHog(30000);
    
    // Clear any existing emails from previous test runs
    await mailhog.clearAllEmails();
    
    console.log('MailHog is ready and cleared for testing');
  } catch (error) {
    console.error('Failed to setup MailHog:', error);
    throw error;
  }
}

export default globalSetup;