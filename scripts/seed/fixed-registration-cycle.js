/**
 * Create or get registration cycle for current year
 * Only one active cycle should exist at a time
 */
async function createRegistrationCycle() {
	try {
		// Check if we already have an active registration cycle
		const { data: existingCycles, error: checkError } = await supabase
			.from('registration_cycles')
			.select('cycle_id, name, start_date, end_date')
			.eq('is_active', true)
			.order('created_at', { ascending: false });

		if (checkError) {
			throw new Error(
				`Error checking registration cycles: ${checkError.message}`
			);
		}

		// If active cycle exists, return it
		if (existingCycles && existingCycles.length > 0) {
			const activeCycle = existingCycles[0];
			console.log(
				`✅ Using existing active registration cycle: ${activeCycle.name}`
			);
			return activeCycle.cycle_id;
		}

		// Otherwise, create a new cycle for the next 6 months
		console.log('🗓️ Creating new registration cycle for next 6 months...');

		const currentDate = new Date();
		const endDate = new Date(currentDate);
		endDate.setMonth(currentDate.getMonth() + 6);

		const startDateString = currentDate.toISOString();
		const endDateString = endDate.toISOString();

		// Name the cycle based on the current season
		let season;
		const month = currentDate.getMonth();
		if (month >= 9) {
			// Oct-Dec
			season = 'Fall';
		} else if (month >= 0 && month < 3) {
			// Jan-Mar
			season = 'Winter';
		} else if (month >= 3 && month <= 5) {
			// Apr-Jun
			season = 'Spring';
		} else {
			// Jul-Aug
			season = 'Summer';
		}

		const year = currentDate.getFullYear();
		const cycleName = `${season} ${year}`;
		const cycleId = `${EXTERNAL_ID_PREFIX}cycle_${year}_${season.toLowerCase()}`;

		const cycleData = {
			cycle_id: cycleId,
			name: cycleName,
			start_date: startDateString,
			end_date: endDateString,
			is_active: true, // This is the active cycle
			created_at: new Date().toISOString(),
		};

		// Force create a new cycle with a unique name by appending a timestamp
		const now = new Date();
		const timestamp = now
			.toISOString()
			.replace(/[^0-9]/g, '')
			.substring(0, 14);
		const humanReadableDate = `${String(now.getMonth() + 1).padStart(
			2,
			'0'
		)}-${String(now.getDate()).padStart(2, '0')}-${now.getFullYear()}`;
		const uniqueCycleName = `${cycleName} (${humanReadableDate})`;
		const uniqueCycleId = `${cycleId}_${timestamp}`;

		console.log(
			`🔄 Creating a new unique registration cycle: ${uniqueCycleName}`
		);

		// Update the cycle data with the unique name and ID
		cycleData.cycle_id = uniqueCycleId;
		cycleData.name = uniqueCycleName;

		// Before inserting, make sure no other cycles are active
		try {
			const { data: activeCycles, error: activeCheckError } = await supabase
				.from('registration_cycles')
				.select('cycle_id')
				.eq('is_active', true);

			if (activeCheckError && activeCheckError.code !== 'PGRST116') {
				throw new Error(
					`Error checking active registration cycles: ${activeCheckError.message}`
				);
			}

			// If there are active cycles, deactivate them
			if (activeCycles && activeCycles.length > 0) {
				console.log(
					`📝 Deactivating ${activeCycles.length} previously active cycle(s)...`
				);

				for (const cycle of activeCycles) {
					const { error: updateError } = await supabase
						.from('registration_cycles')
						.update({ is_active: false })
						.eq('cycle_id', cycle.cycle_id);

					if (updateError) {
						console.warn(
							`⚠️ Could not deactivate cycle ${cycle.cycle_id}: ${updateError.message}`
						);
					}
				}
			}

			// Now insert our new active cycle
			const { data: newCycle, error: insertError } = await supabase
				.from('registration_cycles')
				.insert(cycleData)
				.select()
				.single();

			if (insertError) {
				throw new Error(
					`Failed to create registration cycle: ${insertError.message}`
				);
			}

			console.log(
				`✅ Created registration cycle: ${cycleName} (${startDateString} to ${endDateString})`
			);
			return newCycle.cycle_id;
		} catch (error) {
			console.error(`❌ Error creating registration cycle: ${error.message}`);
			throw error;
		}
	} catch (error) {
		console.error(`❌ Error creating registration cycle: ${error.message}`);
		throw error;
	}
}
