import React from 'react';

/**
 * Safely renders a navigation icon that may be stored as either a React
 * component type (Lucide icon, forwardRef component) or a React element node.
 *
 * Usage:
 *   renderNavIcon(Home)        // Lucide component → <Home className="w-4 h-4" />
 *   renderNavIcon(<MyIcon />)  // Already a React element → returned as-is
 */
export function renderNavIcon(
	Icon: React.ComponentType<{ className?: string }> | React.ReactNode
): React.ReactNode {
	if (React.isValidElement(Icon)) return Icon;

	// Handles Lucide React components (forwardRef objects with $$typeof)
	if (Icon && typeof Icon === 'object' && (Icon as any).$$typeof) {
		const C = Icon as React.ComponentType<{ className?: string }>;
		return <C className="w-4 h-4" />;
	}

	if (typeof Icon === 'function') {
		const C = Icon as React.ComponentType<{ className?: string }>;
		return <C className="w-4 h-4" />;
	}

	return null;
}
