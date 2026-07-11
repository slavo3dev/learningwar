// lib/index.ts
export { createClient as createBrowserSupabaseClient } from './supabase/client';
export { createServerSupabaseClient } from './supabase/server';
export { updateSession } from './supabase/middleware';

export * from './porchLevels';
export * from './porchSelect';
export * from './porchStreak';
export * from './quizConstants';
export * from './prepConstants';
export * from './roleBadge';
