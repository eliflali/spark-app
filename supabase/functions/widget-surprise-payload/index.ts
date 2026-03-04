import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: widget-surprise-payload
//
// Called by the iOS / Android home-screen widget to get the latest surprise
// for the authenticated user's couple.
//
// Authentication: the widget attaches the user's Supabase JWT as a Bearer token.
// The function validates it via the anon key, then calls the
// get_latest_widget_surprise() RPC (SECURITY DEFINER, space-scoped).
//
// Response shape:
//   { "type": "NOTE"|"PHOTO"|"REACTION", "content": "...", "sender_name": "..." }
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// ─────────────────────────────────────────────────────────────────────────────

const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    // Handle CORS pre-flight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: CORS_HEADERS });
    }

    try {
        // Extract the user JWT from the Authorization header
        const authHeader = req.headers.get('Authorization');
        if (!authHeader) {
            return new Response(JSON.stringify({ error: 'Missing Authorization header' }), {
                status: 401,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // Create a USER-scoped client so my_space_id() returns the right value
        // inside the RPC (it reads auth.uid() which requires the user JWT).
        const userClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            {
                global: { headers: { Authorization: authHeader } },
            }
        );

        const { data, error } = await userClient.rpc('get_latest_widget_surprise');

        if (error) {
            console.error('[widget-surprise-payload] RPC error:', error);
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        // data is an array (RETURNS TABLE), take the first row
        const row = Array.isArray(data) ? data[0] : data;

        if (!row) {
            return new Response(JSON.stringify({ data: null }), {
                status: 200,
                headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
            });
        }

        const widgetPayload = {
            type: row.type as 'NOTE' | 'PHOTO' | 'REACTION',
            content: row.content as string,
            sender_name: row.sender_name as string,
            created_at: row.created_at as string,
        };

        return new Response(JSON.stringify({ data: widgetPayload }), {
            status: 200,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    } catch (err) {
        console.error('[widget-surprise-payload] Unexpected error:', err);
        return new Response(JSON.stringify({ error: String(err) }), {
            status: 500,
            headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        });
    }
});
