'use client';

import React from 'react';
import { BibleBeeProgressList } from './bible-bee-progress-list';

export function LeaderBibleBeeProgress({
	cycleId,
	bibleBeeYears,
}: {
	cycleId: string;
	bibleBeeYears?: any[];
}) {
	return (
		<BibleBeeProgressList
			initialCycle={cycleId}
			showGuardianInfo={true}
			showFilters={true}
			showYearSelection={true}
			bibleBeeYears={bibleBeeYears}
		/>
	);
}
export default LeaderBibleBeeProgress;
