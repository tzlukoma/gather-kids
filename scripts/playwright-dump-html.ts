import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const base = 'http://localhost:9002';
  try {
    await page.goto(`${base}/login`, { waitUntil: 'networkidle' });
    await page.fill('#email', 'leader.biblebee@example.com');
    await page.fill('#password', 'password');
    await page.click('button:has-text("Sign In")');
    await page.waitForURL('**/dashboard/**', { timeout: 5000 });
    await page.goto(`${base}/dashboard/bible-bee`, { waitUntil: 'networkidle' });
    const html = await page.content();
    console.log('--- PAGE HTML START ---');
    console.log(html.slice(0, 20000));
    console.log('--- PAGE HTML END ---');
  } catch (err) {
    console.error('Error during dump:', err);
  } finally {
    await browser.close();
  }
})();
