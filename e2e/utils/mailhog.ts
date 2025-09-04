// @ts-ignore
import fetch from 'node-fetch';

const MAILHOG_API = process.env.MAILHOG_API || 'http://localhost:8025/api/v2';
const EMAIL_TIMEOUT = 60000; // 60 seconds

export async function getLatestConfirmationLink(toEmail: string): Promise<string> {
  const searchUrl = `${MAILHOG_API}/search?kind=to&query=${encodeURIComponent(toEmail)}&limit=1`;
  const startTime = Date.now();

  while (Date.now() - startTime < EMAIL_TIMEOUT) {
    try {
      const response = await fetch(searchUrl);
      if (!response.ok) {
        throw new Error(`MailHog API error: ${response.status} ${response.statusText}`);
      }

      const data: any = await response.json();
      const latestEmail = data?.items?.[0];

      if (latestEmail?.Content?.Body) {
        const emailBody = extractEmailBody(latestEmail.Content.Body);
        const confirmationLink = extractConfirmationLink(emailBody);
        
        if (confirmationLink) {
          console.log(`✅ Found confirmation link for ${toEmail}`);
          return confirmationLink;
        }
      }

      // Wait before next check
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn(`MailHog check failed: ${(error as Error).message}`);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  throw new Error(`Timeout: No confirmation email received for ${toEmail} within ${EMAIL_TIMEOUT}ms`);
}

function extractEmailBody(body: string): string {
  // Handle both base64 encoded and plain text bodies
  const base64Pattern = /^[A-Za-z0-9+/=\r\n]+$/;
  if (base64Pattern.test(body.trim())) {
    return Buffer.from(body, 'base64').toString('utf-8');
  }
  return body;
}

function extractConfirmationLink(emailBody: string): string | null {
  // Match various confirmation link patterns
  const linkPatterns = [
    /https?:\/\/[^\s"'<>]+\/auth\/v1\/verify[^\s"'<>]*/g,
    /https?:\/\/[^\s"'<>]+\/confirm[^\s"'<>]*/g,
    /https?:\/\/[^\s"'<>]+\/verify[^\s"'<>]*/g,
    /https?:\/\/[^\s"'<>]+\/magic[^\s"'<>]*/g
  ];

  for (const pattern of linkPatterns) {
    const matches = emailBody.match(pattern);
    if (matches) {
      return matches[0];
    }
  }

  return null;
}

export async function clearMailHogInbox(): Promise<void> {
  try {
    const response = await fetch(`${MAILHOG_API}/messages`, { method: 'DELETE' });
    if (response.ok) {
      console.log('✅ MailHog inbox cleared');
    }
  } catch (error) {
    console.warn('Failed to clear MailHog inbox:', (error as Error).message);
  }
}