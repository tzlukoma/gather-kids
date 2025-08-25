import { ReactNode } from 'react';
import {
	LayoutDashboard,
	CheckCheck,
	Users,
	ShieldAlert,
	FileText,
	ClipboardList,
	Contact,
	Settings,
} from 'lucide-react';
import { AuthRole } from './auth-types';

interface MenuItem {
	href: string;
	icon: ReactNode;
	label: string;
	roles: AuthRole[];
	requiresActive?: boolean;
	ministryCheck?: (ministryIds: string[]) => boolean;
}

export const MENU_ITEMS: MenuItem[] = [
	{
		href: '/dashboard',
		icon: <LayoutDashboard />,
		label: 'Dashboard',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
	},
	{
		href: '/dashboard/check-in',
		icon: <CheckCheck />,
		label: 'Check-In/Out',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.GUARDIAN],
		requiresActive: true,
	},
	{
		href: '/dashboard/rosters',
		icon: <Users />,
		label: 'Rosters',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		requiresActive: true,
	},
	{
		href: '/dashboard/registrations',
		icon: <ClipboardList />,
		label: 'Registrations',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
		requiresActive: true,
	},
	{
		href: '/dashboard/incidents',
		icon: <ShieldAlert />,
		label: 'Incidents',
		roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
	},
	{
		href: '/dashboard/leaders',
		icon: <Contact />,
		label: 'Leaders',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/reports',
		icon: <FileText />,
		label: 'Reports',
		roles: [AuthRole.ADMIN],
	},
	{
		href: '/dashboard/configuration',
		icon: <Settings />,
		label: 'Configuration',
		roles: [AuthRole.ADMIN],
	},
	// Guardian menu items
	{
		href: '/household',
		icon: <Users />,
		label: 'My Household',
		roles: [AuthRole.GUARDIAN],
	},
];

export const getAuthorizedMenuItems = (
	userRole: AuthRole | null,
	isActive: boolean = true,
	ministryIds: string[] = []
): MenuItem[] => {
	if (!userRole) return [];

	return MENU_ITEMS.filter((item) => {
		// Check if user has the required role
		if (!item.roles.includes(userRole)) return false;

		// Check if the item requires an active user
		if (item.requiresActive && !isActive) return false;

		// Check if the item requires specific ministry assignments
		if (item.ministryCheck && !item.ministryCheck(ministryIds)) return false;

		return true;
	});
};
