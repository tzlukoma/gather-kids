import { getGatherSystemIncidentsFlag } from '@/lib/flags/get-gathersystem-incidents-flag';
import { IncidentsContentLegacy } from '@/components/gatherKids/incidents-content-legacy';
import { IncidentsContentGatherSystem } from '@/components/gatherKids/incidents-content-gathersystem';

export default async function Page() {
	const useGatherSystemIncidents = await getGatherSystemIncidentsFlag();

	return useGatherSystemIncidents ? (
		<IncidentsContentGatherSystem />
	) : (
		<IncidentsContentLegacy />
	);
}
