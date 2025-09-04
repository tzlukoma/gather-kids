# Documentation Workflow Guide

This guide explains how to maintain and update the automated external documentation for gatherKids.

## Documentation Structure

The documentation is built using Docusaurus and automatically deployed to GitHub Pages at:
**https://tzlukoma.github.io/gather-kids/**

### Directory Structure

```
doc-site/
├── docs/                          # Main documentation content
│   ├── getting-started.md         # Introduction and quick start
│   └── user-guide/                # Feature-specific user guides
│       ├── overview.md            # User guide overview
│       ├── registration/          # Family registration features
│       ├── ministry-management/   # Ministry configuration
│       ├── check-in-out/         # Check-in/out processes
│       ├── leader-tools/         # Administrative features
│       └── bible-bee/            # Bible Bee competition features
├── releases/                      # Release notes and changelog
│   ├── authors.yml               # Author definitions
│   └── YYYY-MM-DD-*.md          # Individual release notes
├── src/                          # Docusaurus customizations
└── static/                       # Static assets (images, etc.)
```

## Automated Deployment

### Triggers

The documentation automatically rebuilds and deploys when:

1. **Push to main branch**: Updates are deployed within 5-10 minutes
2. **New GitHub release**: Release notes are automatically published
3. **Manual trigger**: Can be run manually from GitHub Actions

### Workflow File

The deployment is handled by `.github/workflows/deploy-docs.yml` which:
- Builds the Docusaurus site
- Deploys to GitHub Pages
- Uses Node.js 18 for consistent builds

## Content Management

### Adding New Features

When adding new features to gatherKids:

1. **Update relevant user guide sections** in `doc-site/docs/user-guide/`
2. **Add screenshots** to help users understand the feature
3. **Update the overview** if the feature introduces new concepts
4. **Test the documentation** locally before committing

### Creating Release Notes

For each release:

1. **Create a new file** in `doc-site/releases/` using the format:
   `YYYY-MM-DD-version-name.md`

2. **Use the following template**:
   ```markdown
   ---
   slug: version-slug
   title: gatherKids vX.Y - Feature Summary
   authors:
     - name: Author Name
       url: https://github.com/username
   tags: [release, features, tag1, tag2]
   ---

   # Release Title

   Brief description of the release.

   ## New Features

   - Feature 1 description
   - Feature 2 description

   ## Improvements

   - Improvement 1
   - Improvement 2

   ## Bug Fixes

   - Fix 1
   - Fix 2

   <!-- truncate -->

   ## Detailed Information

   Detailed information appears after the truncate marker...
   ```

3. **Add appropriate tags** for categorization
4. **Include user-friendly descriptions** (avoid technical jargon)

### Local Development

To work on documentation locally:

```bash
cd doc-site
npm install
npm start
```

This will start a local development server at http://localhost:3000/gather-kids/

### Building and Testing

To test the production build:

```bash
cd doc-site
npm run build
npm run serve
```

## Best Practices

### Writing Guidelines

- **User-focused language**: Write for end users, not developers
- **Step-by-step instructions**: Break down complex processes
- **Screenshots**: Include visual aids where helpful
- **Cross-references**: Link related sections together
- **Search-friendly**: Use clear headings and keywords

### Content Organization

- **Feature-based structure**: Organize by what users want to accomplish
- **Progressive disclosure**: Start with basics, add detail as needed
- **Consistent navigation**: Use the same patterns throughout
- **Update frequency**: Keep content current with the application

### Release Notes Guidelines

- **User benefit focus**: Explain how changes help users
- **Clear descriptions**: Avoid technical implementation details
- **Categorization**: Group related changes together
- **Migration notes**: Include any required user actions

## Troubleshooting

### Common Issues

**Build fails due to broken links:**
- Check that all internal links point to existing pages
- Verify footer links are up to date
- Ensure all referenced images exist

**Authors not recognized:**
- Update `releases/authors.yml` with new authors
- Use consistent author keys in release notes

**Search not working:**
- Search is automatically enabled for all content
- Ensure content has clear headings and structure

### Getting Help

- **Docusaurus Documentation**: https://docusaurus.io/docs
- **GitHub Pages Setup**: Check repository Settings > Pages
- **Local Issues**: Ensure Node.js 18+ is installed

## Future Enhancements

Planned improvements for the documentation system:

- **Automated screenshot generation**: Keep UI images current
- **Multi-language support**: Add translations for other languages
- **Interactive tutorials**: Guided walkthroughs for complex features
- **User feedback system**: Allow users to rate and comment on documentation
- **Analytics integration**: Track which sections are most helpful

## Maintenance

### Regular Tasks

- **Monthly**: Review and update screenshots
- **Per release**: Add comprehensive release notes
- **Quarterly**: Review and reorganize content structure
- **As needed**: Respond to user feedback and questions

### Performance Monitoring

The documentation site is optimized for:
- **Fast loading**: Static site generation
- **Mobile-friendly**: Responsive design
- **SEO-friendly**: Proper meta tags and structure
- **Accessibility**: Screen reader compatible