import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ─────────────────────────────────────────────────────────────────────────────
// Supabase Edge Function: notify-widget-surprise
//
// Trigger: Database Webhook on public.widget_surprises INSERT
// Logic:
//   - Fetch the partner's fcm_token (the other member of the same space)
//   - Send a SILENT push notification (content_available: 1) so the widget
//     performs a background refresh without showing a visible alert.
//
// Secrets required:
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, FIREBASE_SERVICE_ACCOUNT_JSON
// ─────────────────────────────────────────────────────────────────────────────

interface WebhookPayload {
    type: 'INSERT';
    table: string;
    record: {
        id: string;
        couple_id: string;
        sender_id: string;
        type: 'PHOTO' | 'NOTE' | 'REACTION';
        content: string;
        created_at: string;
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

    const tokenResp = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
    });

    const tokenData = await tokenResp.json();
    return tokenData.access_token as string;
}

// ── Send silent FCM push (background widget refresh) ─────────────────────────

async function sendSilentFcm(
    accessToken: string,
    projectId: string,
    fcmToken: string,
    dataPayload: Record<string, string>
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
                // Data-only message — no visible alert, triggers background refresh
                data: {
                    type: 'WIDGET_SURPRISE',
                    ...dataPayload,
                },
                apns: {
                    headers: {
                        'apns-push-type': 'background',
                        'apns-priority': '5',
                    },
                    payload: {
                        aps: {
                            'content-available': 1, // silent push
                        },
                    },
                },
                android: {
                    priority: 'normal',
                    data: {
                        type: 'WIDGET_SURPRISE',
                        ...dataPayload,
                    },
                },
            },
        }),
    });

    if (!resp.ok) {
        const err = await resp.text();
        console.error('[notify-widget-surprise] FCM error:', err);
    }
}

// ── Main handler ──────────────────────────────────────────────────────────────

serve(async (req: Request) => {
    try {
        const payload: WebhookPayload = await req.json();
        const { couple_id, sender_id, type, content } = payload.record;

        const adminClient = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        );

        // Fetch ONLY the partner (not the sender) who has a registered token
        const { data: partnerProfiles } = await adminClient
            .from('profiles')
            .select('id, fcm_token, display_name')
            .eq('space_id', couple_id)
            .neq('id', sender_id)
            .not('fcm_token', 'is', null);

        if (!partnerProfiles || partnerProfiles.length === 0) {
            return new Response(JSON.stringify({ ok: true, reason: 'no partner fcm_token' }), { status: 200 });
        }

        // Fetch sender display_name for the data payload
        const { data: senderProfile } = await adminClient
            .from('profiles')
            .select('display_name')
            .eq('id', sender_id)
            .single();

        const serviceAccountJson = Deno.env.get('FIREBASE_SERVICE_ACCOUNT_JSON')!;
        const sa = JSON.parse(serviceAccountJson);
        const accessToken = await getAccessToken(serviceAccountJson);

        // ── Resolve a downloadable URL for PHOTO surprises ────────────────────
        // WidgetDataBridge uses URLSession.shared (no auth headers). The URL must
        // be either a public URL or a freshly-signed URL so the widget can fetch
        // the bytes without needing a Supabase JWT.
        //
        //  • Raw storage path (no "http"): derive bucket/file and sign it.
        //  • Existing signed URL (/object/sign/): re-sign with fresh 5-min expiry.
        //  • Public URL (/object/public/): pass through as-is.
        let surpriseContent = content;
        if (type === 'PHOTO') {
            const isFullUrl = content.startsWith('http://') || content.startsWith('https://');
            if (!isFullUrl) {
                // Raw path — e.g. "widget-surprises/uuid.jpg"
                const slashIdx = content.indexOf('/');
                const bucket = slashIdx !== -1 ? content.slice(0, slashIdx) : 'widget-surprises';
                const filePath = slashIdx !== -1 ? content.slice(slashIdx + 1) : content;

                const { data: signed, error: signErr } = await adminClient.storage
                    .from(bucket)
                    .createSignedUrl(filePath, 300); // 5-minute window

                if (signed?.signedUrl) {
                    surpriseContent = signed.signedUrl;
                    console.log('[notify-widget-surprise] Generated signed URL for PHOTO (raw path)');
                } else {
                    // Bucket may be public → fall back to public URL
                    const { data: pub } = adminClient.storage.from(bucket).getPublicUrl(filePath);
                    surpriseContent = pub.publicUrl;
                    console.warn('[notify-widget-surprise] Signed URL failed, using public URL:', signErr?.message);
                }
            } else if (content.includes('/object/sign/')) {
                // Existing signed URL — re-sign to guarantee a fresh 5-min expiry.
                try {
                    const urlObj = new URL(content);
                    // Pathname: /storage/v1/object/sign/<bucket>/<filepath...>
                    const parts = urlObj.pathname.split('/object/sign/');
                    if (parts.length === 2) {
                        const segments = parts[1].split('/');
                        const bucket = segments[0];
                        const filePath = segments.slice(1).join('/');
                        const { data: signed } = await adminClient.storage
                            .from(bucket)
                            .createSignedUrl(filePath, 300);
                        if (signed?.signedUrl) {
                            surpriseContent = signed.signedUrl;
                            console.log('[notify-widget-surprise] Re-signed expiring URL for PHOTO');
                        }
                    }
                } catch (_) {
                    // Parse error — keep the original signed URL and hope it is still valid
                }
            } else {
                console.log('[notify-widget-surprise] PHOTO content is a public URL, passing through as-is');
            }
        }

        const dataPayload = {
            surprise_type: type,
            sender_name: senderProfile?.display_name ?? 'Partner',
            // Fully-resolved downloadable URL (signed or public)
            surprise_content: surpriseContent,
        };

        for (const partner of partnerProfiles) {
            if (partner.fcm_token) {
                await sendSilentFcm(accessToken, sa.project_id, partner.fcm_token, dataPayload);
            }
        }

        return new Response(JSON.stringify({ ok: true }), { status: 200 });
    } catch (err) {
        console.error('[notify-widget-surprise] Unexpected error:', err);
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
    }
});
