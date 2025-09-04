#!/bin/bash

# Documentation validation script for gatherKids
# This script validates that the documentation builds correctly

set -e

echo "🚀 gatherKids Documentation Validation"
echo "======================================"

# Check if we're in the right directory
if [ ! -d "doc-site" ]; then
    echo "❌ Error: doc-site directory not found"
    echo "   Please run this script from the project root directory"
    exit 1
fi

echo "📂 Checking documentation structure..."

# Validate required directories exist
required_dirs=("doc-site/docs" "doc-site/releases" "doc-site/src")
for dir in "${required_dirs[@]}"; do
    if [ ! -d "$dir" ]; then
        echo "❌ Error: Required directory $dir not found"
        exit 1
    fi
done

echo "✅ Directory structure is valid"

# Check if key files exist
echo "📋 Checking required files..."

required_files=(
    "doc-site/package.json"
    "doc-site/docusaurus.config.ts"
    "doc-site/sidebars.ts"
    "doc-site/docs/getting-started.md"
    "doc-site/docs/user-guide/overview.md"
    "doc-site/releases/authors.yml"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file $file not found"
        exit 1
    fi
done

echo "✅ Required files are present"

# Change to doc-site directory
cd doc-site

echo "📦 Installing dependencies..."
npm ci --silent

echo "🔧 Building documentation..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Documentation build successful!"
    echo ""
    echo "📊 Build summary:"
    echo "   - Build directory: doc-site/build"
    echo "   - Static files generated successfully"
    echo ""
    echo "🌐 To test locally, run:"
    echo "   cd doc-site && npm run serve"
    echo ""
    echo "🚀 To deploy to GitHub Pages:"
    echo "   Push changes to main branch"
    echo "   GitHub Actions will automatically deploy"
else
    echo "❌ Documentation build failed!"
    exit 1
fi

echo ""
echo "🎉 Documentation validation complete!"