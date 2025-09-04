import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */
const sidebars: SidebarsConfig = {
  // User Guide sidebar with structured sections
  userGuideSidebar: [
    'getting-started',
    {
      type: 'category',
      label: 'User Guide',
      items: [
        'user-guide/overview',
        {
          type: 'category',
          label: 'Registration & Households',
          items: [
            'user-guide/registration/getting-started',
            'user-guide/registration/household-management',
            'user-guide/registration/child-profiles',
          ],
        },
        {
          type: 'category',
          label: 'Ministry Management',
          items: [
            'user-guide/ministry-management/overview',
            'user-guide/ministry-management/configuration',
            'user-guide/ministry-management/enrollments',
          ],
        },
        {
          type: 'category',
          label: 'Check-In & Check-Out',
          items: [
            'user-guide/check-in-out/overview',
            'user-guide/check-in-out/check-in-process',
            'user-guide/check-in-out/check-out-process',
          ],
        },
        {
          type: 'category',
          label: 'Ministry Leader Tools',
          items: [
            'user-guide/leader-tools/dashboard',
            'user-guide/leader-tools/rosters',
            'user-guide/leader-tools/incidents',
            'user-guide/leader-tools/reports',
          ],
        },
        {
          type: 'category',
          label: 'Bible Bee',
          items: [
            'user-guide/bible-bee/overview',
            'user-guide/bible-bee/competitions',
            'user-guide/bible-bee/progress-tracking',
          ],
        },
      ],
    },
  ],
};

export default sidebars;
