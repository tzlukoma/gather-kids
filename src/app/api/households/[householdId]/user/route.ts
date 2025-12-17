import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
	throw new Error('Missing Supabase configuration');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const updateUserSchema = z.object({
	user_id: z.string().uuid('user_id must be a valid UUID'),
});

export async function GET(
	request: NextRequest,
	{ params }: { params: { householdId: string } }
) {
	try {
		const { householdId } = params;

		// Find the current user_households record
		const { data: userHousehold, error: findError } = await supabase
			.from('user_households')
			.select('auth_user_id')
			.eq('household_id', householdId)
			.maybeSingle();

		if (findError) {
			return NextResponse.json(
				{ error: `Failed to find user connection: ${findError.message}` },
				{ status: 500 }
			);
		}

		if (!userHousehold) {
			return NextResponse.json({ user: null });
		}

		// Get user details
		const { data: userData, error: userError } = await supabase.auth.admin.getUserById(
			userHousehold.auth_user_id
		);

		if (userError) {
			return NextResponse.json(
				{ error: `Failed to fetch user: ${userError.message}` },
				{ status: 500 }
			);
		}

		return NextResponse.json({
			user: {
				id: userData?.user?.id || '',
				email: userData?.user?.email || '',
				name: userData?.user?.user_metadata?.full_name || userData?.user?.email || 'Unknown',
			},
		});
	} catch (error) {
		console.error('Error fetching household user:', error);
		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Internal server error',
			},
			{ status: 500 }
		);
	}
}

export async function PUT(
	request: NextRequest,
	{ params }: { params: { householdId: string } }
) {
	try {
		const { householdId } = params;
		const body = await request.json();
		const validated = updateUserSchema.parse(body);
		const { user_id } = validated;

		// Step 1: Find and delete old user_households record
		const { data: oldUserHousehold, error: findError } = await supabase
			.from('user_households')
			.select('auth_user_id')
			.eq('household_id', householdId)
			.maybeSingle();

		if (findError && findError.code !== 'PGRST116') {
			return NextResponse.json(
				{ error: `Failed to find old connection: ${findError.message}` },
				{ status: 500 }
			);
		}

		const oldUserId = oldUserHousehold?.auth_user_id;

		// Delete old connection if it exists
		if (oldUserId) {
			const { error: deleteError } = await supabase
				.from('user_households')
				.delete()
				.eq('auth_user_id', oldUserId)
				.eq('household_id', householdId);

			if (deleteError) {
				return NextResponse.json(
					{ error: `Failed to remove old connection: ${deleteError.message}` },
					{ status: 500 }
				);
			}

			// Clean up old user metadata
			const { data: oldUserData } = await supabase.auth.admin.getUserById(oldUserId);
			if (oldUserData?.user?.user_metadata?.role === 'GUARDIAN') {
				const updatedMetadata = { ...(oldUserData.user?.user_metadata || {}) };
				delete updatedMetadata.role;
				delete updatedMetadata.household_id;

				await supabase.auth.admin.updateUserById(oldUserId, {
					user_metadata: updatedMetadata,
				});
			}
		}

		// Step 2: Check if new user is already connected to another household
		const { data: existingConnection } = await supabase
			.from('user_households')
			.select('household_id')
			.eq('auth_user_id', user_id)
			.maybeSingle();

		if (existingConnection) {
			return NextResponse.json(
				{
					error: `User is already connected to another household (${existingConnection.household_id}). Please disconnect them first.`,
				},
				{ status: 400 }
			);
		}

		// Step 3: Create new user_households record
		const { data: newUserHousehold, error: insertError } = await supabase
			.from('user_households')
			.insert({
				auth_user_id: user_id,
				household_id: householdId,
				created_at: new Date().toISOString(),
			})
			.select()
			.single();

		if (insertError) {
			return NextResponse.json(
				{ error: `Failed to create connection: ${insertError.message}` },
				{ status: 500 }
			);
		}

		// Step 4: Update new user metadata
		const { data: currentUser } = await supabase.auth.admin.getUserById(user_id);

		const { error: updateError } = await supabase.auth.admin.updateUserById(user_id, {
			user_metadata: {
				...currentUser?.user?.user_metadata,
				role: 'GUARDIAN',
				household_id: householdId,
			},
		});

		if (updateError) {
			return NextResponse.json(
				{ error: `Failed to update user metadata: ${updateError.message}` },
				{ status: 500 }
			);
		}

		// Step 5: Get updated user info
		const { data: updatedUserData } = await supabase.auth.admin.getUserById(user_id);

		return NextResponse.json({
			success: true,
			user: {
				id: updatedUserData?.user?.id || '',
				email: updatedUserData?.user?.email || '',
				name: updatedUserData?.user?.user_metadata?.full_name || updatedUserData?.user?.email || 'Unknown',
			},
		});
	} catch (error) {
		console.error('Error updating household user:', error);

		if (error instanceof z.ZodError) {
			return NextResponse.json(
				{ error: 'Validation error', details: error.errors },
				{ status: 400 }
			);
		}

		return NextResponse.json(
			{
				error:
					error instanceof Error
						? error.message
						: 'Internal server error',
			},
			{ status: 500 }
		);
	}
}

