import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: 'gatherKids',
  tagline: 'Comprehensive children\'s ministry management system',
  favicon: 'img/favicon.ico',

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: 'https://tzlukoma.github.io',
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: '/gather-kids/',

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: 'tzlukoma', // Usually your GitHub org/user name.
  projectName: 'gather-kids', // Usually your repo name.

  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: 'en',
    locales: ['en'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/tzlukoma/gather-kids/tree/main/doc-site/',
        },
        blog: {
          path: 'releases',
          routeBasePath: 'releases',
          blogTitle: 'Release Notes',
          blogDescription: 'gatherKids release notes and changelog',
          showReadingTime: false,
          authorsMapPath: 'releases/authors.yml',
          feedOptions: {
            type: ['rss', 'atom'],
            xslt: true,
          },
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            'https://github.com/tzlukoma/gather-kids/tree/main/doc-site/',
          // Useful options to enforce blogging best practices
          onInlineTags: 'warn',
          onInlineAuthors: 'warn',
          onUntruncatedBlogPosts: 'warn',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    // Replace with your project's social card
    image: 'img/docusaurus-social-card.jpg',
    navbar: {
      title: 'gatherKids',
      logo: {
        alt: 'gatherKids Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'userGuideSidebar',
          position: 'left',
          label: 'User Guide',
        },
        {to: '/releases', label: 'Release Notes', position: 'left'},
        {
          href: 'https://github.com/tzlukoma/gather-kids',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Documentation',
          items: [
            {
              label: 'Getting Started',
              to: '/docs/getting-started',
            },
            {
              label: 'User Guide',
              to: '/docs/user-guide/overview',
            },
          ],
        },
        {
          title: 'Features',
          items: [
            {
              label: 'Registration',
              to: '/docs/user-guide/registration/getting-started',
            },
            {
              label: 'Ministry Management',
              to: '/docs/user-guide/ministry-management/overview',
            },
            {
              label: 'Check-In/Out',
              to: '/docs/user-guide/check-in-out/overview',
            },
          ],
        },
        {
          title: 'More',
          items: [
            {
              label: 'Release Notes',
              to: '/releases',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/tzlukoma/gather-kids',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} gatherKids. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
    },
  } satisfies Preset.ThemeConfig,
};

export default config;
