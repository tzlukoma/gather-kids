/**
 * Local synthetic fixtures for help screenshot capture.
 * Only call against local Supabase.
 */
export async function ensureHelpScreenshotFixtures(supabase) {
	const { data: activeCycle, error: cycleError } = await supabase
		.from('registration_cycles')
		.select('cycle_id, name, start_date, end_date, is_active')
		.eq('is_active', true)
		.maybeSingle();
	if (cycleError || !activeCycle?.cycle_id) {
		throw new Error(
			`No active registration cycle: ${cycleError?.message || 'missing row'}`
		);
	}

	const activeStart = new Date(activeCycle.start_date);
	const priorStart = new Date(activeStart);
	priorStart.setFullYear(priorStart.getFullYear() - 1);
	const priorEnd = new Date(activeStart);
	priorEnd.setDate(priorEnd.getDate() - 1);

	const priorDates = {
		name: 'Fall 2025',
		start_date: priorStart.toISOString().slice(0, 10),
		end_date: priorEnd.toISOString().slice(0, 10),
		is_active: false,
	};
	let priorCycleId = 'help_screenshot_prior';
	const { data: existingPrior } = await supabase
		.from('registration_cycles')
		.select('cycle_id')
		.eq('cycle_id', priorCycleId)
		.maybeSingle();
	if (existingPrior) {
		await supabase
			.from('registration_cycles')
			.update(priorDates)
			.eq('cycle_id', priorCycleId);
	} else {
		const { error } = await supabase.from('registration_cycles').insert({
			cycle_id: priorCycleId,
			...priorDates,
		});
		if (error) {
			const { data: byName } = await supabase
				.from('registration_cycles')
				.select('cycle_id, start_date')
				.neq('cycle_id', activeCycle.cycle_id);
			const prior = (byName || []).find(
				(c) => new Date(c.start_date).getTime() < activeStart.getTime()
			);
			if (!prior) {
				throw new Error(`Failed to create prior cycle: ${error.message}`);
			}
			priorCycleId = prior.cycle_id;
		}
	}

	const { data: smith } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'smith@example.com')
		.maybeSingle();
	const { data: johnson } = await supabase
		.from('households')
		.select('household_id')
		.eq('email', 'johnson@example.com')
		.maybeSingle();
	if (!smith?.household_id || !johnson?.household_id) {
		throw new Error(
			'Missing Smith/Johnson seed households. Run npm run seed:dev first.'
		);
	}

	const { data: smithChildren } = await supabase
		.from('children')
		.select('child_id, first_name, household_id')
		.eq('household_id', smith.household_id);
	const { data: johnsonChildren } = await supabase
		.from('children')
		.select('child_id, first_name, household_id')
		.eq('household_id', johnson.household_id);
	if (!smithChildren?.length || !johnsonChildren?.length) {
		throw new Error('Seed households are missing children');
	}

	async function copyEnrollmentsToCycle(children, cycleId) {
		for (const child of children) {
			const { data: current } = await supabase
				.from('ministry_enrollments')
				.select('ministry_id, status')
				.eq('child_id', child.child_id)
				.eq('cycle_id', activeCycle.cycle_id);
			const source =
				current?.length > 0
					? current
					: [{ ministry_id: 'min_sunday_school', status: 'enrolled' }];
			for (const enrollment of source) {
				const { data: exists } = await supabase
					.from('ministry_enrollments')
					.select('enrollment_id')
					.eq('child_id', child.child_id)
					.eq('ministry_id', enrollment.ministry_id)
					.eq('cycle_id', cycleId)
					.maybeSingle();
				if (exists) continue;
				const { error } = await supabase.from('ministry_enrollments').insert({
					enrollment_id: crypto.randomUUID(),
					child_id: child.child_id,
					ministry_id: enrollment.ministry_id,
					cycle_id: cycleId,
					status: enrollment.status || 'enrolled',
				});
				if (error) {
					console.warn(
						`enrollment copy skipped: ${child.first_name} ${error.message}`
					);
				}
			}
		}
	}

	await copyEnrollmentsToCycle(smithChildren, priorCycleId);
	await copyEnrollmentsToCycle(johnsonChildren, priorCycleId);
	await copyEnrollmentsToCycle(johnsonChildren, activeCycle.cycle_id);

	const smithIds = smithChildren.map((c) => c.child_id);
	await supabase
		.from('registrations')
		.delete()
		.in('child_id', smithIds)
		.eq('cycle_id', activeCycle.cycle_id);

	for (const child of johnsonChildren) {
		const { data: exists } = await supabase
			.from('registrations')
			.select('registration_id')
			.eq('child_id', child.child_id)
			.eq('cycle_id', activeCycle.cycle_id)
			.maybeSingle();
		if (exists) continue;
		const { error } = await supabase.from('registrations').insert({
			registration_id: crypto.randomUUID(),
			child_id: child.child_id,
			cycle_id: activeCycle.cycle_id,
			status: 'registered',
			submitted_at: new Date().toISOString(),
			submitted_via: 'help-screenshots',
		});
		if (error) {
			throw new Error(
				`Failed to register ${child.first_name} for current cycle: ${error.message}`
			);
		}
	}

	const { data: activeBb } = await supabase
		.from('bible_bee_cycles')
		.select('id')
		.eq('is_active', true)
		.limit(1)
		.maybeSingle();
	const { data: cycleBb } = await supabase
		.from('bible_bee_cycles')
		.select('id')
		.eq('cycle_id', activeCycle.cycle_id)
		.limit(1)
		.maybeSingle();
	const bibleBeeCycleId = activeBb?.id || cycleBb?.id;
	if (!bibleBeeCycleId) {
		throw new Error('No bible_bee_cycles row. Run npm run seed:dev first.');
	}

	let { data: division } = await supabase
		.from('divisions')
		.select('id')
		.eq('bible_bee_cycle_id', bibleBeeCycleId)
		.eq('name', 'Primary')
		.maybeSingle();
	if (!division) {
		const { data: created, error } = await supabase
			.from('divisions')
			.insert({
				id: crypto.randomUUID(),
				bible_bee_cycle_id: bibleBeeCycleId,
				name: 'Primary',
				description: 'Kindergarten through 8th grade',
				min_grade: 0,
				max_grade: 12,
				minimum_required: 3,
				requires_essay: false,
			})
			.select('id')
			.single();
		if (error) throw new Error(`Failed to create division: ${error.message}`);
		division = created;
	}

	const scriptures = [
		{
			external_id: 'help_shot_john_316',
			reference: 'John 3:16',
			order: 1,
			texts: {
				NIV: 'For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life.',
			},
		},
		{
			external_id: 'help_shot_psalm_23_1',
			reference: 'Psalm 23:1',
			order: 2,
			texts: { NIV: 'The Lord is my shepherd, I lack nothing.' },
		},
		{
			external_id: 'help_shot_phil_4_13',
			reference: 'Philippians 4:13',
			order: 3,
			texts: { NIV: 'I can do all this through him who gives me strength.' },
		},
		{
			external_id: 'help_shot_prov_3_5',
			reference: 'Proverbs 3:5',
			order: 4,
			texts: {
				NIV: 'Trust in the Lord with all your heart and lean not on your own understanding.',
			},
		},
	];

	const scriptureIds = [];
	for (const row of scriptures) {
		const { data: existing } = await supabase
			.from('scriptures')
			.select('id')
			.eq('external_id', row.external_id)
			.maybeSingle();
		if (existing) {
			await supabase
				.from('scriptures')
				.update({ bible_bee_cycle_id: bibleBeeCycleId })
				.eq('id', existing.id);
			scriptureIds.push(existing.id);
			continue;
		}
		const { data: created, error } = await supabase
			.from('scriptures')
			.insert({
				id: crypto.randomUUID(),
				bible_bee_cycle_id: bibleBeeCycleId,
				external_id: row.external_id,
				reference: row.reference,
				order: row.order,
				scripture_order: row.order,
				scripture_number: String(row.order),
				counts_for: 1,
				texts: row.texts,
			})
			.select('id')
			.single();
		if (error) throw new Error(`Failed to insert ${row.reference}: ${error.message}`);
		scriptureIds.push(created.id);
	}

	const participants = [...smithChildren, ...johnsonChildren];
	for (const [index, child] of participants.entries()) {
		const { data: enrolled } = await supabase
			.from('bible_bee_enrollments')
			.select('id')
			.eq('child_id', child.child_id)
			.eq('bible_bee_cycle_id', bibleBeeCycleId)
			.maybeSingle();
		if (!enrolled) {
			const { error } = await supabase.from('bible_bee_enrollments').insert({
				id: crypto.randomUUID(),
				bible_bee_cycle_id: bibleBeeCycleId,
				child_id: child.child_id,
				division_id: division.id,
				auto_enrolled: true,
				enrolled_at: new Date().toISOString(),
			});
			if (error) {
				console.warn(`bible bee enroll ${child.first_name}: ${error.message}`);
			}
		}

		for (const [scriptureIndex, scriptureId] of scriptureIds.entries()) {
			const { data: existingSs } = await supabase
				.from('student_scriptures')
				.select('id')
				.eq('child_id', child.child_id)
				.eq('scripture_id', scriptureId)
				.eq('bible_bee_cycle_id', bibleBeeCycleId)
				.maybeSingle();
			const completed = index === 0 ? scriptureIndex < 2 : index === 2;
			if (existingSs) continue;
			const { error } = await supabase.from('student_scriptures').insert({
				id: crypto.randomUUID(),
				bible_bee_cycle_id: bibleBeeCycleId,
				child_id: child.child_id,
				scripture_id: scriptureId,
				is_completed: completed,
				completed_at: completed ? new Date().toISOString() : null,
			});
			if (error) {
				console.warn(`student scripture ${child.first_name}: ${error.message}`);
			}
		}
	}

	console.log(
		'Help screenshot fixtures ready (prior cycle, returning Smith, registered Johnson, Bible Bee)'
	);
}
