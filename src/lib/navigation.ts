import { AuthRole } from '@/lib/auth-types';
import {
    Book,
    Calendar,
    CheckSquare,
    ClipboardCheck,
    FileText,
    Home,
    Shield,
    Users,
    Palette,
} from 'lucide-react';
import { ComponentType } from 'react';

interface MenuItem {
    label: string;
    href: string;
    icon: ComponentType;
    roles: AuthRole[];
    ministryCheck?: (ids: string[]) => boolean;
}

export const MENU_ITEMS: MenuItem[] = [
    {
        label: 'Dashboard',
        href: '/dashboard',
        icon: Home,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.VOLUNTEER],
    },
    {
        label: 'Check-in',
        href: '/dashboard/check-in',
        icon: CheckSquare,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER, AuthRole.VOLUNTEER],
        ministryCheck: (ids: string[]) => ids.length > 0,
    },
    {
        label: 'Registrations',
        href: '/dashboard/registrations',
        icon: ClipboardCheck,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
    },
    {
        label: 'Rosters',
        href: '/dashboard/rosters',
        icon: Book,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
    },
    {
        label: 'Reports',
        href: '/dashboard/reports',
        icon: FileText,
        roles: [AuthRole.ADMIN],
    },
    {
        label: 'Calendar',
        href: '/dashboard/calendar',
        icon: Calendar,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
    },
    {
        label: 'Leaders',
        href: '/dashboard/leaders',
        icon: Users,
        roles: [AuthRole.ADMIN],
    },
    {
        label: 'Incidents',
        href: '/dashboard/incidents',
        icon: FileText,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
    },
    {
        label: 'Bible Bee',
        href: '/dashboard/bible-bee',
        icon: Book,
        roles: [AuthRole.ADMIN, AuthRole.MINISTRY_LEADER],
        ministryCheck: (ids: string[]) => ids.includes('bible-bee'),
    },
    {
        label: 'Ministries',
        href: '/dashboard/ministries',
        icon: Shield,
        roles: [AuthRole.ADMIN],
    },
    {
        label: 'Branding',
        href: '/dashboard/branding',
        icon: Palette,
        roles: [AuthRole.ADMIN],
    },
];

export const getAuthorizedMenuItems = (
    userRole: AuthRole | null,
    ministryIds: string[] = [],
    isActive: boolean = true
) => {
    if (!userRole) return [] as MenuItem[];
    return MENU_ITEMS.filter((item) => {
        if (!item.roles.includes(userRole)) return false;
        if (item.ministryCheck && !item.ministryCheck(ministryIds)) return false;
        return true;
    });
};
