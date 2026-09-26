import ChildBibleBeeDetail from '@/components/gatherKids/child-bible-bee-detail';
import { BibleBeeHouseholdGatherSystem } from '@/components/gatherKids/bible-bee-household-gathersystem';
import { getGatherSystemBibleBeeHouseholdFlag } from '@/lib/flags/get-gathersystem-bible-bee-household-flag';

/**
 * One child's Bible Bee scriptures or essay.
 *
 * `gathersystem_bible_bee_household` picks the rendering on the server and
 * nothing else: both paths read and write through the same hooks, and the
 * route's guardian guard is unchanged. Off (the default), this is the legacy
 * screen exactly as it was.
 */
export default async function ChildBibleBeePage() {
	const useGatherSystem = await getGatherSystemBibleBeeHouseholdFlag();
	if (useGatherSystem) {
		return (
			<div className="mx-auto w-full max-w-4xl">
				<BibleBeeHouseholdGatherSystem />
			</div>
		);
	}
	return <ChildBibleBeeDetail allowPhotoUpdates={true} />;
}
