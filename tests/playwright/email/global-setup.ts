import { FullConfig } from '@playwright/test';
import { MailHogHelper } from '../utils/mailhog';

async function globalSetup(config: FullConfig) {
  console.log('Setting up email verification test environment...');
  
  const mailhog = new MailHogHelper();
  
  try {
    // Wait for MailHog to be available - this is critical
    await mailhog.waitForMailHog(30000);
    console.log('MailHog is available');
    
    // Clear any existing emails from previous test runs - this is non-critical
    await mailhog.clearAllEmails();
    
    console.log('MailHog is ready for testing');
  } catch (error) {
    // Only fail setup if MailHog itself is not available
    if (error.message.includes('not available within')) {
      console.error('Failed to setup MailHog - service not available:', error);
      throw error;
    } else {
      // Log but don't fail for other errors (like clearing emails)
      console.warn('MailHog setup completed with warnings:', error);
    }
  }
}

export default globalSetup;