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
        roles: [AuthRole.ADMIN, AuthRole.LEADER, AuthRole.STAFF],
    },
    {
        label: 'Check-in',
        href: '/dashboard/check-in',
        icon: CheckSquare,
        roles: [AuthRole.ADMIN, AuthRole.LEADER, AuthRole.STAFF],
        ministryCheck: (ids: string[]) => ids.length > 0,
    },
    {
        label: 'Registrations',
        href: '/dashboard/registrations',
        icon: ClipboardCheck,
        roles: [AuthRole.ADMIN, AuthRole.LEADER],
    },
    {
        label: 'Rosters',
        href: '/dashboard/rosters',
        icon: Book,
        roles: [AuthRole.ADMIN, AuthRole.LEADER],
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
        roles: [AuthRole.ADMIN, AuthRole.LEADER],
    },
    {
        label: 'Leaders',
        href: '/dashboard/leaders',
        icon: Users,
        roles: [AuthRole.ADMIN],
    },
    {
        label: 'Configuration',
        href: '/dashboard/configuration',
        icon: Shield,
        roles: [AuthRole.ADMIN],
    },
];
