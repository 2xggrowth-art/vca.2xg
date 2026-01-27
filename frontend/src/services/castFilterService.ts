/**
 * Cast Filter Service
 *
 * Provides utilities for filtering projects by cast composition
 * using Supabase JSONB queries.
 */

import { supabase } from '@/lib/supabase';
import type { CastComposition, CastFilter, ViralAnalysis } from '@/types';

// ============================================
// SUPABASE QUERY BUILDERS
// ============================================

/**
 * Apply cast filters to a Supabase query
 * @param query - The base Supabase query
 * @param filters - Cast filter criteria
 * @returns The modified query with filters applied
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyCastFilters(
  query: any,
  filters: CastFilter
): any {
  let filteredQuery = query;

  // Men filters
  if (filters.minMen !== undefined) {
    filteredQuery = filteredQuery.gte('cast_composition->man', filters.minMen);
  }
  if (filters.maxMen !== undefined) {
    filteredQuery = filteredQuery.lte('cast_composition->man', filters.maxMen);
  }

  // Women filters
  if (filters.minWomen !== undefined) {
    filteredQuery = filteredQuery.gte('cast_composition->woman', filters.minWomen);
  }
  if (filters.maxWomen !== undefined) {
    filteredQuery = filteredQuery.lte('cast_composition->woman', filters.maxWomen);
  }

  // Boys filters
  if (filters.minBoys !== undefined) {
    filteredQuery = filteredQuery.gte('cast_composition->boy', filters.minBoys);
  }
  if (filters.maxBoys !== undefined) {
    filteredQuery = filteredQuery.lte('cast_composition->boy', filters.maxBoys);
  }

  // Girls filters
  if (filters.minGirls !== undefined) {
    filteredQuery = filteredQuery.gte('cast_composition->girl', filters.minGirls);
  }
  if (filters.maxGirls !== undefined) {
    filteredQuery = filteredQuery.lte('cast_composition->girl', filters.maxGirls);
  }

  // Total filters
  if (filters.minTotal !== undefined) {
    filteredQuery = filteredQuery.gte('cast_composition->total', filters.minTotal);
  }
  if (filters.maxTotal !== undefined) {
    filteredQuery = filteredQuery.lte('cast_composition->total', filters.maxTotal);
  }

  // Owner required filter
  if (filters.ownerRequired !== null && filters.ownerRequired !== undefined) {
    filteredQuery = filteredQuery.eq('cast_composition->include_owner', filters.ownerRequired);
  }

  return filteredQuery;
}

// ============================================
// PRE-BUILT FILTER QUERIES
// ============================================

/**
 * Find projects needing specific cast composition
 */
export async function findProjectsByCast(
  filters: CastFilter
): Promise<ViralAnalysis[]> {
  let query = supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED');

  query = applyCastFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching projects by cast:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find projects where owner (Syed Sir) is needed
 */
export async function findProjectsNeedingOwner(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .eq('cast_composition->include_owner', true);

  if (error) {
    console.error('Error fetching projects needing owner:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find projects needing children (boys or girls)
 */
export async function findProjectsNeedingChildren(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .or('cast_composition->boy.gt.0,cast_composition->girl.gt.0');

  if (error) {
    console.error('Error fetching projects needing children:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find projects needing seniors
 */
export async function findProjectsNeedingSeniors(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .or('cast_composition->senior_man.gt.0,cast_composition->senior_woman.gt.0');

  if (error) {
    console.error('Error fetching projects needing seniors:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find projects needing teenagers
 */
export async function findProjectsNeedingTeens(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .or('cast_composition->teen_boy.gt.0,cast_composition->teen_girl.gt.0');

  if (error) {
    console.error('Error fetching projects needing teens:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find solo projects (total cast = 1)
 */
export async function findSoloProjects(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .eq('cast_composition->total', 1);

  if (error) {
    console.error('Error fetching solo projects:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find small cast projects (total <= 3)
 */
export async function findSmallCastProjects(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .lte('cast_composition->total', 3);

  if (error) {
    console.error('Error fetching small cast projects:', error);
    throw error;
  }

  return data || [];
}

/**
 * Find large cast projects (total >= 5)
 */
export async function findLargeCastProjects(): Promise<ViralAnalysis[]> {
  const { data, error } = await supabase
    .from('viral_analyses')
    .select('*')
    .eq('status', 'APPROVED')
    .gte('cast_composition->total', 5);

  if (error) {
    console.error('Error fetching large cast projects:', error);
    throw error;
  }

  return data || [];
}

// ============================================
// CAST COMPOSITION UTILITIES
// ============================================

/**
 * Calculate total from individual cast counts
 */
export function calculateCastTotal(cast: Partial<CastComposition>): number {
  return (
    (cast.man || 0) +
    (cast.woman || 0) +
    (cast.boy || 0) +
    (cast.girl || 0) +
    (cast.teen_boy || 0) +
    (cast.teen_girl || 0) +
    (cast.senior_man || 0) +
    (cast.senior_woman || 0)
  );
}

/**
 * Validate cast composition (ensure no negative values)
 */
export function validateCastComposition(cast: CastComposition): boolean {
  return (
    cast.man >= 0 &&
    cast.woman >= 0 &&
    cast.boy >= 0 &&
    cast.girl >= 0 &&
    cast.teen_boy >= 0 &&
    cast.teen_girl >= 0 &&
    cast.senior_man >= 0 &&
    cast.senior_woman >= 0
  );
}

/**
 * Get a human-readable summary of cast composition
 */
export function getCastSummary(cast: CastComposition): string {
  const parts: string[] = [];

  if (cast.man > 0) parts.push(`${cast.man} man${cast.man > 1 ? '' : ''}`);
  if (cast.woman > 0) parts.push(`${cast.woman} woman${cast.woman > 1 ? '' : ''}`);
  if (cast.boy > 0) parts.push(`${cast.boy} boy${cast.boy > 1 ? 's' : ''}`);
  if (cast.girl > 0) parts.push(`${cast.girl} girl${cast.girl > 1 ? 's' : ''}`);
  if (cast.teen_boy > 0) parts.push(`${cast.teen_boy} teen boy${cast.teen_boy > 1 ? 's' : ''}`);
  if (cast.teen_girl > 0) parts.push(`${cast.teen_girl} teen girl${cast.teen_girl > 1 ? 's' : ''}`);
  if (cast.senior_man > 0) parts.push(`${cast.senior_man} senior man${cast.senior_man > 1 ? '' : ''}`);
  if (cast.senior_woman > 0) parts.push(`${cast.senior_woman} senior woman${cast.senior_woman > 1 ? '' : ''}`);

  if (cast.include_owner) {
    parts.push('+ Owner');
  }

  if (parts.length === 0) {
    return 'No cast specified';
  }

  return parts.join(', ');
}

/**
 * Check if cast needs any children
 */
export function needsChildren(cast: CastComposition): boolean {
  return cast.boy > 0 || cast.girl > 0;
}

/**
 * Check if cast needs any seniors
 */
export function needsSeniors(cast: CastComposition): boolean {
  return cast.senior_man > 0 || cast.senior_woman > 0;
}

/**
 * Check if cast needs any teenagers
 */
export function needsTeens(cast: CastComposition): boolean {
  return cast.teen_boy > 0 || cast.teen_girl > 0;
}

/**
 * Get cast complexity level
 */
export function getCastComplexity(cast: CastComposition): 'solo' | 'small' | 'medium' | 'large' {
  const total = cast.total || calculateCastTotal(cast);

  if (total <= 1) return 'solo';
  if (total <= 3) return 'small';
  if (total <= 6) return 'medium';
  return 'large';
}

// ============================================
// CAST PRESETS
// ============================================

export const CAST_PRESETS: Record<string, CastComposition> = {
  solo_male: {
    man: 1, woman: 0, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: false, total: 1,
  },
  solo_female: {
    man: 0, woman: 1, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: false, total: 1,
  },
  couple: {
    man: 1, woman: 1, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: false, total: 2,
  },
  family_small: {
    man: 1, woman: 1, boy: 1, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: false, total: 3,
  },
  family_large: {
    man: 1, woman: 1, boy: 1, girl: 1,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: false, total: 4,
  },
  multi_generation: {
    man: 1, woman: 1, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 1, senior_woman: 1,
    include_owner: false, total: 4,
  },
  owner_solo: {
    man: 0, woman: 0, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: true, total: 0,
  },
  owner_with_team: {
    man: 2, woman: 2, boy: 0, girl: 0,
    teen_boy: 0, teen_girl: 0, senior_man: 0, senior_woman: 0,
    include_owner: true, total: 4,
  },
};

export const CAST_PRESET_LABELS: Record<string, string> = {
  solo_male: 'Solo (Male)',
  solo_female: 'Solo (Female)',
  couple: 'Couple',
  family_small: 'Small Family',
  family_large: 'Large Family',
  multi_generation: 'Multi-Generation',
  owner_solo: 'Owner Only',
  owner_with_team: 'Owner + Team',
};
