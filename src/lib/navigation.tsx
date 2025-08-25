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
import { ROLES, UserRole } from './constants/roles';

interface MenuItem {
	href: string;
	icon: ReactNode;
	label: string;
	roles: UserRole[];
	requiresActive?: boolean;
	ministryCheck?: (ministryIds: string[]) => boolean;
}

export const MENU_ITEMS: MenuItem[] = [
	{
		href: '/dashboard',
		icon: <LayoutDashboard />,
		label: 'Dashboard',
		roles: [ROLES.ADMIN, ROLES.MINISTRY_LEADER],
	},
	{
		href: '/dashboard/check-in',
		icon: <CheckCheck />,
		label: 'Check-In/Out',
		roles: [ROLES.ADMIN, ROLES.MINISTRY_LEADER, ROLES.GUARDIAN],
		requiresActive: true,
	},
	{
		href: '/dashboard/rosters',
		icon: <Users />,
		label: 'Rosters',
		roles: [ROLES.ADMIN, ROLES.MINISTRY_LEADER],
		requiresActive: true,
	},
	{
		href: '/dashboard/registrations',
		icon: <ClipboardList />,
		label: 'Registrations',
		roles: [ROLES.ADMIN, ROLES.MINISTRY_LEADER],
		requiresActive: true,
	},
	{
		href: '/dashboard/incidents',
		icon: <ShieldAlert />,
		label: 'Incidents',
		roles: [ROLES.ADMIN, ROLES.MINISTRY_LEADER],
	},
	{
		href: '/dashboard/leaders',
		icon: <Contact />,
		label: 'Leaders',
		roles: [ROLES.ADMIN],
	},
	{
		href: '/dashboard/reports',
		icon: <FileText />,
		label: 'Reports',
		roles: [ROLES.ADMIN],
	},
	{
		href: '/dashboard/configuration',
		icon: <Settings />,
		label: 'Configuration',
		roles: [ROLES.ADMIN],
	},
	// Guardian menu items
	{
		href: '/household',
		icon: <Users />,
		label: 'My Household',
		roles: [ROLES.GUARDIAN],
	},
];

export const getAuthorizedMenuItems = (
	userRole: UserRole | null,
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
