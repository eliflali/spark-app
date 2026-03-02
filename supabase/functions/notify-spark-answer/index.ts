import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: notify-spark-answer
//
// Trigger: Database Webhook on public.daily_answers INSERT
// The webhook sends a POST to this function with the new row as JSON body.
//
// Logic:
//   - Count how many answers exist for (spark_id, couple_id)
//   - Case A (count == 1): Notify the partner "Your partner just answered!"
//   - Case B (count == 2): Notify BOTH partners "The Spark is revealed! ✨"
//
// Secrets required (add in Supabase Dashboard → Edge Functions → Secrets):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_SERVICE_ACCOUNT_JSON
// ─────────────────────────────────────────────────────────────────────────────

interface WebhookPayload {
    type: 'INSERT';
    table: string;
    record: {
        id: string;
        spark_id: string;
        couple_id: string;
        user_id: string;
        answer_text: string;
    };
}

// ── Minimal Google OAuth2 JWT for FCM HTTP v1 API ─────────────────────────────

async function getAccessToken(serviceAccountJson: string): Promise<string> {
    const sa = JSON.parse(serviceAccountJson);
    const now = Math.floor(Date.now() / 1000);

    const header = btoa(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const payload = btoa(
        JSON.stringify({
            iss: sa.client_email,
            scope: 'https://www.googleapis.com/auth/firebase.messaging',
            aud: 'https://oauth2.googleapis.com/token',
            iat: now,
            exp: now + 3600,
        })
    );

    const toSign = `${header}.${payload}`;

    // Import the RSA private key
    const pemKey = sa.private_key
        .replace(/-----BEGIN PRIVATE KEY-----/, '')
        .replace(/-----END PRIVATE KEY-----/, '')
        .replace(/\n/g, '');

    const binaryKey = Uint8Array.from(atob(pemKey), (c) => c.charCodeAt(0));
    const cryptoKey = await crypto.subtle.importKey(
        'pkcs8',
        binaryKey,
        { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
        false,
        ['sign']
    );

    const signature = await crypto.subtle.sign(
        'RSASSA-PKCS1-v1_5',
        cryptoKey,
        new TextEncoder().encode(toSign)
    );

    const sigBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    const jwt = `${toSign}.${sigBase64}`;

    // Exchange JWT for access token
    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResp.json();
    return tokenData.access_token as string;
}

// ── Send FCM notification to a single token ───────────────────────────────────

async function sendFcmNotification(
    accessToken: string,
    projectId: string,
    fcmToken: string,
    title: string,
    body: string
): Promise<void> {
    const url = `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`;
    const resp = await fetch(url, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: {
                token: fcmToken,
                notification: { title, body },
                apns: {
                    payload: { aps: { sound: 'default', badge: 1 } },
                },
                android: {
                    notification: { sound: 'default' },
                },
            },
        }),
    });
    if (!resp.ok) {
        const err = await resp.text();
        console.error('[notify-spark-answer] FCM error:', err);
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    try {
        const payload: WebhookPayload = await req.json();
        const { spark_id, couple_id, user_id } = payload.record;

        // Admin Supabase client (bypasses RLS)
        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Count answers for this spark in this couple
        const { count } = await adminClient
            .from('daily_answers')
            .select('id', { count: 'exact', head: true })
            .eq('spark_id', spark_id)
            .eq('couple_id', couple_id);

        const answerCount = count ?? 0;

        // Fetch all profiles in this couple_id (space)
        const { data: profiles } = await adminClient
            .from('profiles')
            .select('id, fcm_token')
            .eq('space_id', couple_id)
            .not('fcm_token', 'is', null);

        if (!profiles || profiles.length === 0) {
            return new Response(JSON.stringify({ ok: true, reason: 'no fcm_tokens' }), { status: 200 });
        }

        // Firebase auth
        const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!;
        const sa = JSON.parse(serviceAccountJson);
        const accessToken = await getAccessToken(serviceAccountJson);

        if (answerCount === 1) {
            // Case A: First answer — notify the PARTNER only
            const partnerProfile = profiles.find((p) => p.id !== user_id);
            if (partnerProfile?.fcm_token) {
                await sendFcmNotification(
                    accessToken,
                    sa.project_id,
                    partnerProfile.fcm_token,
                    'Time to answer your Spark! 🔒',
                    'Your partner just answered today\'s Spark. Unlock it with your answer!'
                );
            }
        } else if (answerCount >= 2) {
            // Case B: Both answered — notify BOTH
            for (const profile of profiles) {
                if (profile.fcm_token) {
                    await sendFcmNotification(
                        accessToken,
                        sa.project_id,
                        profile.fcm_token,
                        'The Spark is revealed! ✨',
                        'Both of you answered. Tap to see what you both wrote.'
                    );
                }
            }
        }

        return new Response(JSON.stringify({ ok: true, answerCount }), { status: 200 });
    } catch (err) {
        console.error('[notify-spark-answer] Unexpected error:', err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
});
