import React from 'react';
import { ReactNode, ComponentType } from 'react';
import {
	LayoutDashboard,
	CheckCheck,
	Users,
	ShieldAlert,
	FileText,
	ClipboardList,
	Contact,
	Settings,
	Book,
	Palette,
	UserCog,
} from 'lucide-react';
import { AuthRole } from './auth-types';

interface MenuItem {
	href: string;
	icon: ComponentType<any> | ReactNode;
	label: string;
	roles: AuthRole[];
	requiresActive?: boolean;
	ministryCheck?: (ministryIds: string[], userRole?: AuthRole) => boolean;
	isBeta?: boolean;
}

export const MENU_ITEMS: MenuItem[] = [
	{
		href: '/dashboard',
		icon: LayoutDashboard,
		label: 'Dashboard',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/check-in',
		icon: CheckCheck,
		label: 'Check-In/Out',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN],
		requiresActive: true,
		isBeta: true,
		// Only show check-in to admins or leaders assigned to Sunday School
		ministryCheck: (ministryIds: string[], userRole?: AuthRole) =>
			userRole === AuthRole.ADMIN || ministryIds.includes('min_sunday_school'),
	},
	{
		href: '/dashboard/rosters',
		icon: Users,
		label: 'Rosters',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		requiresActive: true,
		isBeta: true,
	},
	{
		href: '/dashboard/registrations',
		icon: ClipboardList,
		label: 'Registrations',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		requiresActive: true,
	},
	{
		href: '/dashboard/incidents',
		icon: ShieldAlert,
		label: 'Incidents',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		isBeta: true,
	},
	{
		href: '/dashboard/bible-bee',
		// Inline bee SVG to use as the Bible Bee icon
		icon: (
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				strokeWidth={1.5}
				className="h-5 w-5">
				<path d="M12 3c.667 0 2 1.333 2 2s-1.333 2-2 2-2-1.333-2-2 1.333-2 2-2z" />
				<path d="M7 8c-1 1-2 2-2 4s1 3 3 3h.5" />
				<path d="M17 8c1 1 2 2 2 4s-1 3-3 3h-.5" />
				<path d="M9 14c0 1 1 3 3 3s3-2 3-3" />
				<path d="M12 7v7" strokeLinecap="round" strokeLinejoin="round" />
			</svg>
		),
		label: 'Bible Bee',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		requiresActive: true,
		isBeta: true,
		ministryCheck: (ministryIds: string[], userRole?: AuthRole) =>
			userRole === AuthRole.ADMIN || ministryIds.includes('bible-bee'),
	},
	{
		href: '/dashboard/leaders',
		icon: Contact,
		label: 'Leaders',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/users',
		icon: UserCog,
		label: 'Users',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/reports',
		icon: FileText,
		label: 'Reports',
		roles: [AuthRole.ADMIN],
		isBeta: true,
	},
	{
		href: '/dashboard/ministries',
		icon: Settings,
		label: 'Ministries',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/branding',
		icon: Palette,
		label: 'Branding',
		roles: [AuthRole.ADMIN],
	},
	// Guardian menu items
	{
		href: '/household',
		icon: Users,
		label: 'My Household',
		roles: [AuthRole.GUARDIAN],
	},
];

export const getAuthorizedMenuItems = (
	userRole: AuthRole | null,
	ministryIds: string[] = [],
	isActive: boolean = true
): MenuItem[] => {
	if (!userRole) return [];

	return MENU_ITEMS.filter((item) => {
		// Check if user has the required role
		if (!item.roles.includes(userRole)) return false;

		// Check if the item requires an active user
		if (item.requiresActive && !isActive) return false;

		// Check if the item requires specific ministry assignments
		if (item.ministryCheck && !item.ministryCheck(ministryIds, userRole))
			return false;

		return true;
	});
};
