/**
 * Creates a registration cycle for the next 6 months starting from the current date
 * @returns {Promise<string>} The ID of the created/existing registration cycle
 */
async function createRegistrationCycle() {
	try {
		console.log('📅 Creating registration cycle for the next 6 months...');

		// Create a cycle starting from current date (September 2025) through the next 6 months
		const currentDate = new Date();
		const startDate = new Date(currentDate);
		const endDate = new Date(currentDate);
		endDate.setMonth(endDate.getMonth() + 6); // 6 months from now

		// Format dates for database
		const startDateString = startDate.toISOString().split('T')[0]; // YYYY-MM-DD
		const endDateString = endDate.toISOString().split('T')[0]; // YYYY-MM-DD

		// Create cycle name based on the current year and season
		const month = currentDate.getMonth();
		let season;
		if (month >= 8 && month <= 11) {
			// Sep-Dec
			season = 'Fall';
		} else if (month >= 0 && month <= 2) {
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

		// Check if a cycle with this name already exists
		const { data: existingCycle, error: checkError } = await supabase
			.from('registration_cycles')
			.select('cycle_id, name')
			.eq('name', cycleName)
			.single();

		if (checkError && checkError.code !== 'PGRST116') {
			throw new Error(
				`Error checking registration cycle: ${checkError.message}`
			);
		}

		if (existingCycle) {
			console.log(`✅ Registration cycle already exists: ${cycleName}`);
			return existingCycle.cycle_id;
		} else {
			// Before inserting, make sure no other cycles are active
			const { data: activeCycles, error: activeCheckError } = await supabase
				.from('registration_cycles')
				.select('cycle_id')
				.eq('is_active', true);

			if (activeCheckError) {
				throw new Error(
					`Error checking active cycles: ${activeCheckError.message}`
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
		}
	} catch (error) {
		console.error(`❌ Error creating registration cycle: ${error.message}`);
		throw error;
	}
}
