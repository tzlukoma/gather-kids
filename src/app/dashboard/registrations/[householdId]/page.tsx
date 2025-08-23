
"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useParams } from "next/navigation";
import { getHouseholdProfile } from "@/lib/dal";
import { HouseholdProfile } from "@/components/ministrysync/household-profile";

export default function HouseholdProfilePage() {
    const params = useParams();
    const householdId = params.householdId as string;

    const profileData = useLiveQuery(() => getHouseholdProfile(householdId), [householdId]);

    if (!profileData) {
        return <div>Loading household profile...</div>;
    }

    if (!profileData.household) {
        return <div>Household not found.</div>;
    }

    return (
        <HouseholdProfile profileData={profileData} />
    );
}
