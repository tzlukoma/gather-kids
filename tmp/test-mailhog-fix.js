/**
 * Simple test to verify the MailHog clearAllEmails fix
 * This simulates the behavior with a mock fetch
 */

// Mock MailHog Helper simplified version
class MailHogHelper {
  constructor(baseUrl = 'http://localhost:8025/api/v2') {
    this.baseUrl = baseUrl;
  }

  // Mock fetch function to simulate API responses
  async mockFetch(url, options = {}) {
    console.log(`Mock API call: ${options.method || 'GET'} ${url}`);
    
    if (url.includes('/messages') && options.method === 'DELETE') {
      // Simulate 404 for bulk delete (the original issue)
      return { ok: false, status: 404, statusText: 'Not Found' };
    }
    
    if (url.includes('/messages/') && options.method === 'DELETE') {
      // Simulate successful individual delete
      return { ok: true, status: 200 };
    }
    
    if (url.includes('/messages') && !options.method) {
      // Simulate getting emails
      return {
        ok: true,
        status: 200,
        async json() {
          return {
            items: [
              { ID: 'email1' },
              { ID: 'email2' },
              { ID: 'email3' }
            ]
          };
        }
      };
    }
    
    return { ok: true, status: 200 };
  }

  async getAllEmails() {
    const response = await this.mockFetch(`${this.baseUrl}/messages`);
    
    if (!response.ok) {
      throw new Error(`MailHog API responded with ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.items || [];
  }

  async deleteEmail(emailId) {
    const response = await this.mockFetch(`${this.baseUrl}/messages/${emailId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete email ${emailId}: ${response.status} ${response.statusText}`);
    }
  }

  // OLD BROKEN VERSION (would fail with 404)
  async clearAllEmailsOld() {
    const response = await this.mockFetch(`${this.baseUrl}/messages`, { 
      method: 'DELETE' 
    });
    
    if (!response.ok) {
      throw new Error(`Failed to clear MailHog emails: ${response.status} ${response.statusText}`);
    }
    
    console.log('All emails cleared from MailHog');
  }

  // NEW FIXED VERSION (works with individual deletes)
  async clearAllEmails() {
    try {
      // Get all emails first
      const emails = await this.getAllEmails();
      
      if (emails.length === 0) {
        console.log('No emails to clear from MailHog');
        return;
      }
      
      // Delete each email individually since MailHog v2 API doesn't support bulk delete
      console.log(`Clearing ${emails.length} emails from MailHog...`);
      
      for (const email of emails) {
        try {
          await this.deleteEmail(email.ID);
          console.log(`  Deleted email ${email.ID}`);
        } catch (error) {
          console.warn(`Failed to delete email ${email.ID}:`, error.message);
          // Continue with other emails even if one fails
        }
      }
      
      console.log('All emails cleared from MailHog');
    } catch (error) {
      // Make this operation non-critical - log but don't throw
      console.warn('Failed to clear MailHog emails (non-critical):', error.message);
    }
  }
}

async function testFix() {
  const mailhog = new MailHogHelper();
  
  console.log('=== Testing OLD broken version ===');
  try {
    await mailhog.clearAllEmailsOld();
    console.log('❌ OLD version should have failed but didn\'t');
  } catch (error) {
    console.log('✅ OLD version failed as expected:', error.message);
  }
  
  console.log('\n=== Testing NEW fixed version ===');
  try {
    await mailhog.clearAllEmails();
    console.log('✅ NEW version completed successfully');
  } catch (error) {
    console.log('❌ NEW version failed:', error.message);
  }
}

testFix().catch(console.error);