#!/bin/bash
# Script to check for hardcoded colors in the codebase
# Usage: ./scripts/lint-colors.sh

echo "🎨 Checking for hardcoded colors in the codebase..."
echo ""

# Check for hex colors (excluding globals.css and specific chart overrides)
echo "Checking for hex colors..."
HEX_VIOLATIONS=$(find src -name "*.tsx" -o -name "*.ts" | xargs grep -H "#[0-9a-fA-F]" | grep -v "chart.tsx" | grep -v "globals.css" || true)

if [ -n "$HEX_VIOLATIONS" ]; then
    echo "❌ Found hardcoded hex colors:"
    echo "$HEX_VIOLATIONS"
    echo ""
else
    echo "✅ No hardcoded hex colors found"
    echo ""
fi

# Check for RGB colors
echo "Checking for RGB colors..."
RGB_VIOLATIONS=$(find src -name "*.tsx" -o -name "*.ts" | xargs grep -H "rgb(" || true)

if [ -n "$RGB_VIOLATIONS" ]; then
    echo "❌ Found hardcoded RGB colors:"
    echo "$RGB_VIOLATIONS"
    echo ""
else
    echo "✅ No hardcoded RGB colors found"
    echo ""
fi

# Check for hardcoded Tailwind color classes (excluding muted)
echo "Checking for hardcoded Tailwind color classes..."
TAILWIND_VIOLATIONS=$(find src -name "*.tsx" -o -name "*.ts" | xargs grep -E "bg-(blue|red|green|yellow|orange|purple|pink|gray|indigo|cyan|teal|lime|amber|emerald|violet|fuchsia|rose)-[0-9]" | grep -v "bg-muted" || true)

if [ -n "$TAILWIND_VIOLATIONS" ]; then
    echo "❌ Found hardcoded Tailwind color classes:"
    echo "$TAILWIND_VIOLATIONS"
    echo ""
else
    echo "✅ No hardcoded Tailwind color classes found"
    echo ""
fi

# Summary
if [ -z "$HEX_VIOLATIONS" ] && [ -z "$RGB_VIOLATIONS" ] && [ -z "$TAILWIND_VIOLATIONS" ]; then
    echo "🎉 All color checks passed! Design system tokens are being used correctly."
    exit 0
else
    echo "⚠️  Color violations found. Please use design system tokens:"
    echo "   - Brand colors: bg-brand-teal, bg-brand-yellow, bg-brand-orange, bg-brand-aqua"
    echo "   - Neutral colors: bg-surface, text-ink"
    echo "   - Semantic colors: bg-primary, bg-secondary, bg-muted, etc."
    exit 1
fi