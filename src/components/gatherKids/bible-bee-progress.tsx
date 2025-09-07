'use client';

import React from 'react';
import { BibleBeeProgressList } from './bible-bee-progress-list';

export function LeaderBibleBeeProgress({ cycleId }: { cycleId: string }) {
	return (
		<BibleBeeProgressList
			initialCycle={cycleId}
			showGuardianInfo={true}
			showFilters={true}
			showYearSelection={true}
		/>
	);
}
export default LeaderBibleBeeProgress;
