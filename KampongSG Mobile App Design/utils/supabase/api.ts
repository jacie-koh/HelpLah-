import { projectId } from './info.tsx';

/**
 * Must match the Edge Function folder under `supabase/functions/<name>` — that name is the URL segment
 * after `/functions/v1/`. Server routes also use this as their first path segment (see index.ts).
 */
export const supabaseRouterPrefix = 'make-server-fd25410b';

export const supabaseFunctionsApiBase = `https://${projectId}.supabase.co/functions/v1/${supabaseRouterPrefix}`;
