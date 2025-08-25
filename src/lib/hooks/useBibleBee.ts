import { useEffect, useState } from 'react';
import { db } from '@/lib/db';
import type { CompetitionYear, GradeRule, Scripture } from '@/lib/types';
import { createCompetitionYear, upsertScripture, createGradeRule as createRule } from '@/lib/bibleBee';

export function useCompetitionYears() {
    const [years, setYears] = useState<CompetitionYear[]>([]);
    useEffect(() => {
        let mounted = true;
        db.competitionYears.toArray().then(y => { if (mounted) setYears(y.sort((a, b) => b.year - a.year)); });
        return () => { mounted = false };
    }, []);
    return { years, refresh: async () => { const y = await db.competitionYears.toArray(); setYears(y); } };
}

export function useScripturesForYear(yearId: string) {
    const [scriptures, setScriptures] = useState<Scripture[]>([]);
    useEffect(() => {
        let mounted = true;
        db.scriptures.where('competitionYearId').equals(yearId).sortBy('sortOrder').then(s => { if (mounted) setScriptures(s); });
        return () => { mounted = false };
    }, [yearId]);
    return { scriptures, refresh: async () => { const s = await db.scriptures.where('competitionYearId').equals(yearId).sortBy('sortOrder'); setScriptures(s); } };
}

export async function createGradeRule(payload: Omit<GradeRule, 'id' | 'createdAt' | 'updatedAt'>) {
    return createRule(payload as any);
}
