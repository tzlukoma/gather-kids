/**
 * MailHog API helper for Playwright email verification tests
 * Provides utilities to interact with MailHog API for email testing
 */

export interface MailHogMessage {
  ID: string;
  From: {
    Relays: string | null;
    Mailbox: string;
    Domain: string;
    Params: string;
  };
  To: Array<{
    Relays: string | null;
    Mailbox: string;
    Domain: string;
    Params: string;
  }>;
  Content: {
    Headers: Record<string, string[]>;
    Body: string;
    Size: number;
    MIME: null;
  };
  Created: string;
  MIME: null;
  Raw: {
    From: string;
    To: string[];
    Data: string;
    Helo: string;
  };
}

export interface MailHogResponse {
  total: number;
  count: number;
  start: number;
  items: MailHogMessage[];
}

export class MailHogHelper {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8025/api/v2') {
    this.baseUrl = baseUrl;
  }

  /**
   * Wait for and retrieve the latest email from MailHog
   * @param timeout Maximum time to wait for email in milliseconds
   * @param toEmail Optional filter by recipient email
   * @returns Latest email message
   */
  async getLatestEmail(timeout = 30000, toEmail?: string): Promise<MailHogMessage> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.baseUrl}/messages`);
        
        if (!response.ok) {
          throw new Error(`MailHog API responded with ${response.status}: ${response.statusText}`);
        }

        const data: MailHogResponse = await response.json();
        
        if (data.items && data.items.length > 0) {
          // If filtering by email, find the matching one
          if (toEmail) {
            const matchingEmail = data.items.find(email => 
              email.To.some(recipient => 
                recipient.Mailbox.toLowerCase() === toEmail.toLowerCase().split('@')[0] &&
                recipient.Domain.toLowerCase() === toEmail.toLowerCase().split('@')[1]
              )
            );
            if (matchingEmail) {
              return matchingEmail;
            }
          } else {
            // Return the most recent email
            return data.items[0];
          }
        }
      } catch (error) {
        console.error('Error fetching emails from MailHog:', error);
      }
      
      // Wait 500ms before retrying
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    throw new Error(`No email received within timeout period of ${timeout}ms${toEmail ? ` for ${toEmail}` : ''}`);
  }

  /**
   * Extract magic link from email content
   * Looks for various patterns of auth callback URLs
   * @param email MailHog email message
   * @returns Extracted magic link URL
   */
  async extractMagicLink(email: MailHogMessage): Promise<string> {
    const htmlContent = email.Content.Body;
    
    // Try multiple regex patterns for magic links
    const linkPatterns = [
      // Pattern for auth/callback URLs
      /href="([^"]*auth\/callback[^"]*)"/gi,
      // Pattern for magic link URLs with tokens
      /href="([^"]*magic[^"]*)"/gi,
      // Pattern for verification URLs
      /href="([^"]*verify[^"]*)"/gi,
      // Pattern for any URL with auth tokens/codes
      /href="([^"]*[?&](?:token|code)=[^"]*)"/gi,
      // Generic pattern for localhost callback URLs
      /href="(http:\/\/localhost:[0-9]+\/[^"]*(?:auth|callback|verify)[^"]*)"/gi,
    ];
    
    for (const pattern of linkPatterns) {
      const matches = Array.from(htmlContent.matchAll(pattern));
      if (matches.length > 0) {
        const link = matches[0][1];
        // Decode HTML entities
        const decodedLink = link
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        console.log(`Extracted magic link: ${decodedLink}`);
        return decodedLink;
      }
    }
    
    // If no pattern matches, log the email content for debugging
    console.error('Magic link not found in email content');
    console.error('Email subject:', email.Content.Headers.Subject?.[0] || 'No subject');
    console.error('Email body preview:', htmlContent.substring(0, 500));
    
    throw new Error('Magic link not found in email content');
  }

  /**
   * Extract verification link from email content
   * Looks for email verification links (different from magic auth links)
   * @param email MailHog email message
   * @returns Extracted verification link URL
   */
  async extractVerificationLink(email: MailHogMessage): Promise<string> {
    const htmlContent = email.Content.Body;
    
    // Try multiple regex patterns for verification links
    const linkPatterns = [
      // Pattern for verification URLs
      /href="([^"]*verify[^"]*)"/gi,
      // Pattern for confirmation URLs
      /href="([^"]*confirm[^"]*)"/gi,
      // Pattern for email verification URLs
      /href="([^"]*email.*verify[^"]*)"/gi,
      // Pattern for auth URLs with verification tokens
      /href="([^"]*auth.*verify[^"]*)"/gi,
      // Pattern for any URL with verification tokens
      /href="([^"]*[?&](?:verification|token|confirm)=[^"]*)"/gi,
      // Generic pattern for localhost verification URLs
      /href="(http:\/\/localhost:[0-9]+\/[^"]*(?:verify|confirm)[^"]*)"/gi,
    ];
    
    for (const pattern of linkPatterns) {
      const matches = Array.from(htmlContent.matchAll(pattern));
      if (matches.length > 0) {
        const link = matches[0][1];
        // Decode HTML entities
        const decodedLink = link
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'");
        
        console.log(`Extracted verification link: ${decodedLink}`);
        return decodedLink;
      }
    }
    
    // If no pattern matches, log the email content for debugging
    console.error('Verification link not found in email content');
    console.error('Email subject:', email.Content.Headers.Subject?.[0] || 'No subject');
    console.error('Email body preview:', htmlContent.substring(0, 500));
    
    throw new Error('Verification link not found in email content');
  }

  /**
   * Get all emails from MailHog
   * @returns Array of all email messages
   */
  async getAllEmails(): Promise<MailHogMessage[]> {
    const response = await fetch(`${this.baseUrl}/messages`);
    
    if (!response.ok) {
      throw new Error(`MailHog API responded with ${response.status}: ${response.statusText}`);
    }

    const data: MailHogResponse = await response.json();
    return data.items || [];
  }

  /**
   * Clear all emails from MailHog
   * Useful for test cleanup
   */
  async clearAllEmails(): Promise<void> {
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
        } catch (error) {
          console.warn(`Failed to delete email ${email.ID}:`, error);
          // Continue with other emails even if one fails
        }
      }
      
      console.log('All emails cleared from MailHog');
    } catch (error) {
      // Make this operation non-critical - log but don't throw
      console.warn('Failed to clear MailHog emails (non-critical):', error);
    }
  }

  /**
   * Wait for MailHog to be available
   * @param timeout Maximum time to wait
   */
  async waitForMailHog(timeout = 30000): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      try {
        const response = await fetch(`${this.baseUrl}/messages`);
        if (response.ok) {
          console.log('MailHog is available');
          return;
        }
      } catch (error) {
        // MailHog not ready yet
      }
      
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    throw new Error(`MailHog not available within ${timeout}ms`);
  }

  /**
   * Get email count
   * @returns Number of emails in MailHog
   */
  async getEmailCount(): Promise<number> {
    const response = await fetch(`${this.baseUrl}/messages`);
    
    if (!response.ok) {
      throw new Error(`MailHog API responded with ${response.status}: ${response.statusText}`);
    }

    const data: MailHogResponse = await response.json();
    return data.total || 0;
  }

  /**
   * Delete a specific email by ID
   * @param emailId MailHog email ID
   */
  async deleteEmail(emailId: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}/messages/${emailId}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      throw new Error(`Failed to delete email ${emailId}: ${response.status} ${response.statusText}`);
    }
  }
}