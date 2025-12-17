import { NextRequest, NextResponse } from 'next/server';
import { dbAdapter } from '@/lib/db-utils';

export async function GET(request: NextRequest) {
	try {
		const searchParams = request.nextUrl.searchParams;
		const searchTerm = searchParams.get('q') || '';
		const limit = parseInt(searchParams.get('limit') || '20', 10);

		if (!searchTerm || searchTerm.length < 2) {
			return NextResponse.json({ households: [] });
		}

		// Search households by name, address, city
		const households = await dbAdapter.listHouseholds({
			search: searchTerm,
			limit,
		});

		// Also search guardians by email to find households
		// Use empty string to get all guardians, then filter
		const allGuardians = await dbAdapter.listGuardians('');
		const matchingGuardians = allGuardians.filter(
			(g) =>
				g.email &&
				g.email.toLowerCase().includes(searchTerm.toLowerCase())
		);

		// Get unique household IDs from matching guardians
		const guardianHouseholdIds = [
			...new Set(matchingGuardians.map((g) => g.household_id)),
		];

		// Fetch households for guardian matches that aren't already in results
		const existingHouseholdIds = new Set(
			households.map((h) => h.household_id)
		);
		const additionalHouseholdIds = guardianHouseholdIds.filter(
			(id) => !existingHouseholdIds.has(id)
		);

		const additionalHouseholds = await Promise.all(
			additionalHouseholdIds.map((id) => dbAdapter.getHousehold(id))
		);

		const allHouseholds = [
			...households,
			...additionalHouseholds.filter((h): h is NonNullable<typeof h> => h !== null),
		].slice(0, limit);

		// Enrich with guardian and children data
		const enrichedHouseholds = await Promise.all(
			allHouseholds.map(async (household) => {
				// Get primary guardian
				const guardians = await dbAdapter.listGuardians(household.household_id);
				const primaryGuardian = guardians.find((g) => g.is_primary);

				// Get children count
				const children = await dbAdapter.listChildren({ householdId: household.household_id });
				const childrenCount = children.filter((c) => c.is_active !== false).length;

				return {
					household_id: household.household_id,
					name: household.name || 'Unnamed Household',
					primary_email: household.primary_email || primaryGuardian?.email || null,
					primary_guardian_email: primaryGuardian?.email || null,
					address_line1: household.address_line1 || null,
					city: household.city || null,
					state: household.state || null,
					children_count: childrenCount,
				};
			})
		);

		return NextResponse.json({ households: enrichedHouseholds });
	} catch (error) {
		console.error('Error searching households:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Failed to search households',
			},
			{ status: 500 }
		);
	}
}

