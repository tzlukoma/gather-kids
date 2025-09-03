import { FullConfig } from '@playwright/test';
import { MailHogHelper } from '../utils/mailhog';

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up email verification test environment...');
  
  const mailhog = new MailHogHelper();
  
  try {
    // Clear all test emails
    await mailhog.clearAllEmails();
    console.log('Test emails cleaned up successfully');
  } catch (error) {
    console.warn('Failed to cleanup emails (this is not critical):', error);
  }
}

export default globalTeardown;