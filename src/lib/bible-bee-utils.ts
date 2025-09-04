import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { DatabaseAdapter } from './database/types';
import { Scripture } from './types';

/**
 * Gets the appropriate database adapter instance based on the current environment
 * @returns {Promise<{ dbAdapter: DatabaseAdapter, isSupabase: boolean }>}
 */
export async function getScriptures(yearId: string): Promise<Scripture[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // First check if this is a Bible Bee year ID
    let query = supabase.from('scriptures').select('*');
    
    // Try with year_id first (new schema)
    query = query.eq('year_id', yearId);
    
    let { data, error } = await query;
    
    if (error) throw error;
    
    // If no results, try with competitionYearId (legacy schema)
    if (!data || data.length === 0) {
      const legacyQuery = supabase.from('scriptures').select('*').eq('competitionYearId', yearId);
      const result = await legacyQuery;
      
      if (result.error) throw result.error;
      data = result.data || [];
    }
    
    // Sort the scriptures by sortOrder or scripture_order
    return (data || []).sort(
      (a, b) => Number(a.sortOrder ?? a.scripture_order ?? 0) - Number(b.sortOrder ?? b.scripture_order ?? 0)
    );
  } catch (error) {
    console.error('Error fetching scriptures:', error);
    throw error;
  }
}

/**
 * Gets competition years from the database
 */
export async function getCompetitionYears(): Promise<any[]> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase credentials');
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Check if the competitionYears table exists
    const { data, error } = await supabase.from('competitionYears').select('*');
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Sort by year in descending order
    return (data || []).sort((a, b) => b.year - a.year);
  } catch (error) {
    console.error('Error fetching competition years:', error);
    return [];
  }
}
