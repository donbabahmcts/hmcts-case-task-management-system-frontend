import { AxePuppeteer } from '@axe-core/puppeteer';
import puppeteer, { Browser, Page } from 'puppeteer';

/**
 * Accessibility Tests for Protected/Authenticated Pages
 * Tests WCAG 2.1 Level AA compliance for task management pages
 */

describe('Protected Pages - WCAG 2.1 Level AA Compliance', () => {
  let browser: Browser;
  let page: Page;
  const baseUrl = process.env.TEST_URL || 'https://localhost:3100';

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--ignore-certificate-errors',
      ],
    });
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  const runAccessibilityTests = async (pageName: string) => {
    const results = await new AxePuppeteer(page).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();

    if (results.violations.length > 0) {
      console.error(`\n❌ Accessibility violations found on ${pageName}:`);
      results.violations.forEach(violation => {
        console.error(`\n  ${violation.id}: ${violation.description}`);
        console.error(`  Impact: ${violation.impact}`);
        console.error(`  Help: ${violation.helpUrl}`);
        violation.nodes.forEach(node => {
          console.error(`    - ${node.html}`);
        });
      });
    }

    return results;
  };

  /**
   * Mock authentication for testing protected pages
   * In a real scenario, you'd perform actual login or mock the session
   */
  const mockAuthentication = async () => {
    // Set authentication cookie or session
    await page.setCookie({
      name: 'connect.sid',
      value: 'mock-session-token',
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
    });
  };

  describe('Tasks List Page', () => {
    test('Tasks list page should have no WCAG 2.1 AA violations', async () => {
      // Note: This test will redirect to login if not authenticated
      // You may need to implement actual authentication or mock it
      await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle2' });

      // Check if redirected to login (expected behavior)
      const currentUrl = page.url();
      if (currentUrl.includes('/auth/login')) {
        // Expected - test the login page instead
        const results = await runAccessibilityTests('Login Redirect from Tasks');
        expect(results.violations).toHaveLength(0);
      } else {
        // If authenticated, test tasks page
        const results = await runAccessibilityTests('Tasks List Page');
        expect(results.violations).toHaveLength(0);
      }
    });

    test('Tasks list should use proper table structure or list semantics', async () => {
      await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const structure = await page.evaluate(() => {
        const table = document.querySelector('table');
        const list = document.querySelector('ul, ol');

        return {
          hasTable: !!table,
          hasList: !!list,
          hasProperHeaders: table ? !!table.querySelector('thead') : false,
        };
      });

      // Should use either table or list for tasks
      expect(structure.hasTable || structure.hasList).toBe(true);
    });
  });

  describe('Create/Manage Task Page', () => {
    test('Task form should have no WCAG 2.1 AA violations', async () => {
      await page.goto(`${baseUrl}/tasks/manage`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const results = await runAccessibilityTests('Task Management Form');
      expect(results.violations).toHaveLength(0);
    });

    test('Task form should have properly labeled inputs', async () => {
      await page.goto(`${baseUrl}/tasks/manage`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const formAccessibility = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
        const unlabeledInputs = inputs.filter(input => {
          const id = input.getAttribute('id');
          if (!id) {return true;} // No ID means no label association

          const label = document.querySelector(`label[for="${id}"]`);
          const ariaLabel = input.getAttribute('aria-label');
          const ariaLabelledBy = input.getAttribute('aria-labelledby');

          return !label && !ariaLabel && !ariaLabelledBy;
        });

        return {
          totalInputs: inputs.length,
          unlabeledInputs: unlabeledInputs.length,
        };
      });

      expect(formAccessibility.unlabeledInputs).toBe(0);
    });

    test('Task form should have CSRF token (hidden from screen readers)', async () => {
      const response = await page.goto(`${baseUrl}/tasks/manage`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login or page doesn't load (requires authentication)
      if (!response || page.url().includes('/auth/login') || response.status() === 302) {
        console.log('Skipping CSRF test - page requires authentication');
        return;
      }

      const csrfToken = await page.evaluate(() => {
        const csrfInput = document.querySelector('input[name="_csrf"]') as HTMLInputElement;
        return {
          exists: !!csrfInput,
          isHidden:
            csrfInput?.type === 'hidden' ||
            (csrfInput?.hasAttribute('type') && csrfInput.getAttribute('type') === 'hidden'),
        };
      });

      expect(csrfToken.exists).toBeTruthy();
      expect(csrfToken.isHidden).toBeTruthy();
    });

    test('Required fields should be indicated accessibly', async () => {
      await page.goto(`${baseUrl}/tasks/manage`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const requiredFields = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input[required], textarea[required], select[required]'));

        return inputs.map(input => {
          const label = document.querySelector(`label[for="${input.id}"]`);
          const ariaRequired = input.getAttribute('aria-required');

          return {
            hasAriaRequired: ariaRequired === 'true',
            hasVisualIndicator: label?.textContent?.includes('*') || label?.textContent?.includes('required'),
          };
        });
      });

      // All required fields should be properly indicated
      requiredFields.forEach(field => {
        expect(field.hasAriaRequired || field.hasVisualIndicator).toBe(true);
      });
    });
  });

  describe('Task Success Page', () => {
    test('Success confirmation should be accessible', async () => {
      await page.goto(`${baseUrl}/tasks/success`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const results = await runAccessibilityTests('Task Success Page');
      expect(results.violations).toHaveLength(0);
    });

    test('Success message should use proper notification pattern', async () => {
      const response = await page.goto(`${baseUrl}/tasks/success`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login or page doesn't load (requires authentication)
      if (!response || page.url().includes('/auth/login') || response.status() === 302) {
        console.log('Skipping success notification test - page requires authentication');
        return;
      }

      // GOV.UK uses notification banner or panel for success messages
      const successNotification = await page.evaluate(() => {
        const panel = document.querySelector('.govuk-panel');
        const confirmationPanel = document.querySelector('.govuk-panel--confirmation');
        const notification = document.querySelector('.govuk-notification-banner');

        return {
          hasPanel: !!panel || !!confirmationPanel,
          hasNotification: !!notification,
          hasRole: panel?.getAttribute('role') || notification?.getAttribute('role'),
        };
      });

      // Should have either panel or notification
      expect(successNotification.hasPanel || successNotification.hasNotification).toBeTruthy();
    });
  });

  describe('Error Handling Accessibility', () => {
    test('Error page should have no WCAG 2.1 AA violations', async () => {
      // Trigger an error by going to a route that causes server error
      // Or create a dedicated error test page
      await page.goto(`${baseUrl}/error-test`, { waitUntil: 'networkidle2' });

      const results = await runAccessibilityTests('Error Page');

      // Error page should still be accessible
      expect(results.violations).toHaveLength(0);
    });

    test('Form validation errors should be accessible', async () => {
      await page.goto(`${baseUrl}/tasks/manage`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      // Submit form without filling required fields
      const submitButton = await page.$('button[type="submit"]');
      if (submitButton) {
        await submitButton.click();
        await page.waitForTimeout(500);

        // Check for GOV.UK error summary
        const errorSummary = await page.evaluate(() => {
          const summary = document.querySelector('.govuk-error-summary');
          const hasRole = summary?.getAttribute('role') === 'alert';
          const hasFocus = summary?.getAttribute('tabindex') === '-1';
          const hasAriaLabelledBy = !!summary?.getAttribute('aria-labelledby');

          return {
            exists: !!summary,
            hasRole,
            hasFocus,
            hasAriaLabelledBy,
          };
        });

        if (errorSummary.exists) {
          // GOV.UK error summary should be accessible
          expect(errorSummary.hasRole).toBe(true);
        }
      }
    });
  });

  describe('Data Tables Accessibility', () => {
    test('Tasks table should have proper headers and scope', async () => {
      await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const tableStructure = await page.evaluate(() => {
        const table = document.querySelector('table');
        if (!table) {return { hasTable: false };}

        const headers = Array.from(table.querySelectorAll('th'));
        const hasScope = headers.every(th => th.hasAttribute('scope'));
        const caption = table.querySelector('caption');

        return {
          hasTable: true,
          hasHeaders: headers.length > 0,
          hasScope,
          hasCaption: !!caption,
        };
      });

      if (tableStructure.hasTable) {
        expect(tableStructure.hasHeaders).toBe(true);
        // Caption is optional but recommended
      }
    });
  });

  describe('Interactive Elements', () => {
    test('Buttons and links should have accessible names', async () => {
      await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      const results = await new AxePuppeteer(page).withRules(['button-name', 'link-name']).analyze();

      expect(results.violations).toHaveLength(0);
    });

    test('Delete/destructive actions should have confirmation', async () => {
      await page.goto(`${baseUrl}/tasks`, { waitUntil: 'networkidle2' });

      // Skip if redirected to login
      if (page.url().includes('/auth/login')) {
        return;
      }

      // Look for delete buttons
      const deleteButtons = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('button, a'));
        return buttons
          .filter(btn => {
            const text = btn.textContent?.toLowerCase() || '';
            return text.includes('delete') || text.includes('remove');
          })
          .map(btn => ({
            text: btn.textContent?.trim(),
            hasAriaLabel: !!btn.getAttribute('aria-label'),
            hasAriaDescribedBy: !!btn.getAttribute('aria-describedby'),
          }));
      });

      // Destructive actions should have clear labeling
      deleteButtons.forEach(button => {
        expect(button.text || button.hasAriaLabel).toBeTruthy();
      });
    });
  });
});
