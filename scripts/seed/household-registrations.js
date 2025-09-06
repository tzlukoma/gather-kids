/**
 * Create household registrations with multiple ministry enrollments
 */
async function createHouseholdRegistrations() {
	try {
		console.log(
			'📋 Creating household registrations with ministry enrollments...'
		);

		// Get households
		const { data: households, error: householdsError } = await supabase
			.from('households')
			.select('household_id, external_id')
			.like('external_id', `${EXTERNAL_ID_PREFIX}%`)
			.limit(10); // Get first 10 households

		if (householdsError) {
			throw new Error(`Failed to fetch households: ${householdsError.message}`);
		}

		if (!households || !households.length) {
			console.log('⚠️ No households found, skipping registrations');
			return;
		}

		console.log(`✅ Found ${households.length} households for registrations`);

		// Get all children from these households
		const { data: householdChildren, error: childrenError } = await supabase
			.from('children')
			.select('child_id, household_id, external_id, first_name, last_name')
			.in(
				'household_id',
				households.map((h) => h.household_id)
			);

		if (childrenError) {
			throw new Error(`Failed to fetch children: ${childrenError.message}`);
		}

		// Get all ministries
		const { data: ministries, error: ministryError } = await supabase
			.from('ministries')
			.select('ministry_id, name, external_id')
			.like('ministry_id', `${EXTERNAL_ID_PREFIX}%`);

		if (ministryError) {
			throw new Error(`Failed to fetch ministries: ${ministryError.message}`);
		}

		if (!ministries || ministries.length < 5) {
			console.log('⚠️ Not enough ministries found, need at least 5');
			return;
		}

		// Get active registration cycle
		const { data: cycles, error: cyclesError } = await supabase
			.from('registration_cycles')
			.select('cycle_id')
			.eq('is_active', true)
			.limit(1);

		if (cyclesError) {
			throw new Error(
				`Failed to fetch registration cycles: ${cyclesError.message}`
			);
		}

		const activeCycleId =
			cycles && cycles.length > 0 ? cycles[0].cycle_id : null;

		if (!activeCycleId) {
			console.log('⚠️ No active registration cycle found, creating one');

			// Create an active registration cycle
			const cycleData = {
				cycle_id: `${EXTERNAL_ID_PREFIX}cycle_2025_fall`,
				name: 'Fall 2025',
				start_date: '2025-08-01',
				end_date: '2025-12-31',
				is_active: true,
				created_at: new Date().toISOString(),
			};

			const { error: insertCycleError } = await supabase
				.from('registration_cycles')
				.insert(cycleData);

			if (insertCycleError) {
				throw new Error(
					`Failed to create registration cycle: ${insertCycleError.message}`
				);
			}

			console.log(`✅ Created registration cycle: ${cycleData.name}`);

			// Use the newly created cycle
			var activeCycleId = cycleData.cycle_id;
		}

		// Create registrations for each household
		for (const household of households) {
			const householdId = household.household_id;

			// Get children for this household
			const children = householdChildren.filter(
				(c) => c.household_id === householdId
			);

			if (!children || children.length === 0) {
				console.log(
					`⚠️ No children found for household ${household.external_id}, skipping registration`
				);
				continue;
			}

			// Create a registration
			const registrationData = {
				registration_id: `${EXTERNAL_ID_PREFIX}reg_${
					household.external_id.split('_')[2]
				}`,
				household_id: householdId,
				cycle_id: activeCycleId,
				status: 'approved',
				created_at: new Date().toISOString(),
				approved_at: new Date().toISOString(),
			};

			// Check if registration already exists
			const { data: existingReg, error: checkRegError } = await supabase
				.from('registrations')
				.select('registration_id')
				.eq('registration_id', registrationData.registration_id)
				.single();

			if (checkRegError && checkRegError.code !== 'PGRST116') {
				console.error(`Error checking registration: ${checkRegError.message}`);
				continue;
			}

			if (existingReg) {
				console.log(
					`✅ Registration already exists for household ${household.external_id}`
				);
			} else {
				const { error: insertRegError } = await supabase
					.from('registrations')
					.insert(registrationData);

				if (insertRegError) {
					console.error(
						`Failed to create registration for household ${household.external_id}: ${insertRegError.message}`
					);
					continue;
				}

				console.log(
					`✅ Created registration for household ${household.external_id}`
				);
			}

			// Now enroll each child in at least 5 random ministries
			for (const child of children) {
				// Shuffle ministries and take first 5
				const shuffledMinistries = [...ministries]
					.sort(() => 0.5 - Math.random())
					.slice(0, 5);

				// Skip if we don't have enough ministries
				if (shuffledMinistries.length < 5) {
					console.log(
						`⚠️ Not enough ministries for child ${child.external_id}, need 5`
					);
					continue;
				}

				// Create enrollments for each ministry
				for (const ministry of shuffledMinistries) {
					const enrollmentData = {
						enrollment_id: `${EXTERNAL_ID_PREFIX}enroll_${
							child.external_id.split('_')[2]
						}_${ministry.external_id || ministry.ministry_id.split('_').pop()}`,
						child_id: child.child_id,
						ministry_id: ministry.ministry_id,
						status: 'active',
						created_at: new Date().toISOString(),
					};

					// Check if enrollment already exists
					const { data: existingEnroll, error: checkEnrollError } =
						await supabase
							.from('ministry_enrollments')
							.select('enrollment_id')
							.eq('enrollment_id', enrollmentData.enrollment_id)
							.single();

					if (checkEnrollError && checkEnrollError.code !== 'PGRST116') {
						console.error(
							`Error checking enrollment: ${checkEnrollError.message}`
						);
						continue;
					}

					if (existingEnroll) {
						console.log(
							`✅ Enrollment already exists: ${enrollmentData.enrollment_id}`
						);
					} else {
						const { error: insertEnrollError } = await supabase
							.from('ministry_enrollments')
							.insert(enrollmentData);

						if (insertEnrollError) {
							console.error(
								`Failed to create enrollment ${enrollmentData.enrollment_id}: ${insertEnrollError.message}`
							);
							continue;
						}

						console.log(
							`✅ Created enrollment: ${enrollmentData.enrollment_id}`
						);
					}
				}

				console.log(
					`✅ Enrolled child ${child.first_name} ${child.last_name} in 5 ministries`
				);
			}
		}

		console.log('✅ Household registrations created successfully');
	} catch (error) {
		console.error('❌ Error creating household registrations:', error);
	}
}
