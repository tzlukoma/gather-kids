export type HelpNavLink = {
	title: string;
	href: string;
	slug: string;
};

export type HelpNavSection = {
	title: string;
	items: HelpNavLink[];
};

export type HelpSidebar = {
	home: HelpNavLink;
	sections: HelpNavSection[];
};

function link(title: string, slug: string): HelpNavLink {
	return {
		title,
		slug,
		href: slug ? `/help/${slug}` : '/help',
	};
}

export const HELP_SIDEBAR: HelpSidebar = {
	home: link('User guide', ''),
	sections: [
		{
			title: 'Getting started',
			items: [link('Welcome to gatherKids', 'getting-started')],
		},
		{
			title: 'Registration & households',
			items: [
				link('Overview', 'user-guide/overview'),
				link('Register your family', 'user-guide/registration/getting-started'),
				link(
					'Manage your household',
					'user-guide/registration/household-management'
				),
				link('Child profiles', 'user-guide/registration/child-profiles'),
			],
		},
		{
			title: 'Ministry management',
			items: [
				link('Overview', 'user-guide/ministry-management/overview'),
				link('Program setup', 'user-guide/ministry-management/configuration'),
				link('Enrollments', 'user-guide/ministry-management/enrollments'),
			],
		},
		{
			title: 'Check-in / check-out',
			items: [
				link('Overview', 'user-guide/check-in-out/overview'),
				link('Check children in', 'user-guide/check-in-out/check-in-process'),
				link('Check children out', 'user-guide/check-in-out/check-out-process'),
			],
		},
		{
			title: 'Leader tools',
			items: [
				link('Dashboard', 'user-guide/leader-tools/dashboard'),
				link('Rosters', 'user-guide/leader-tools/rosters'),
				link('Incidents', 'user-guide/leader-tools/incidents'),
				link('Reports', 'user-guide/leader-tools/reports'),
			],
		},
		{
			title: 'Bible Bee',
			items: [
				link('Overview', 'user-guide/bible-bee/overview'),
				link('Competitions', 'user-guide/bible-bee/competitions'),
				link('Progress tracking', 'user-guide/bible-bee/progress-tracking'),
			],
		},
	],
};

export function flattenHelpLinks(sidebar: HelpSidebar = HELP_SIDEBAR): HelpNavLink[] {
	return [sidebar.home, ...sidebar.sections.flatMap((section) => section.items)];
}

export function allHelpSlugs(sidebar: HelpSidebar = HELP_SIDEBAR): string[] {
	return flattenHelpLinks(sidebar)
		.map((item) => item.slug)
		.filter((slug) => slug.length > 0);
}
