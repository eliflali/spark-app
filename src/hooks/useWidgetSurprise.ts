import { useEffect, useState, useCallback } from 'react';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as FileSystem from 'expo-file-system/legacy';
import { decode } from 'base64-arraybuffer';
import { NativeModules } from 'react-native';
import { supabase } from '@/src/lib/supabase';
import { useAuth } from '@/src/context/AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type SurpriseType = 'PHOTO' | 'NOTE' | 'REACTION';

export interface WidgetSurprise {
    id: string;
    type: SurpriseType;
    content: string;
    sender_name: string;
    sender_id: string;
    created_at: string;
}

interface UseWidgetSurprise {
    /** Most recent surprise for this couple (from either partner) */
    latestSurprise: WidgetSurprise | null;
    /** Most recent surprise SENT BY the partner (shown as incoming preview) */
    partnerSurprise: WidgetSurprise | null;
    loading: boolean;
    sending: boolean;
    error: string | null;
    /** Send a sticky-note surprise */
    sendNote: (text: string) => Promise<void>;
    /** Open camera / gallery, upload photo, send surprise */
    sendPhoto: (source?: 'camera' | 'gallery') => Promise<void>;
    /** Send a reaction emoji */
    sendReaction: (emoji: string) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useWidgetSurprise(): UseWidgetSurprise {
    const { user } = useAuth();

    const [latestSurprise, setLatestSurprise] = useState<WidgetSurprise | null>(null);
    const [partnerSurprise, setPartnerSurprise] = useState<WidgetSurprise | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [coupleId, setCoupleId] = useState<string | null>(null);
    const [myDisplayName, setMyDisplayName] = useState<string>('Me');

    // ── Fetch latest surprise ─────────────────────────────────────────────────

    const fetchLatest = useCallback(async () => {
        try {
            const { data, error: rpcErr } = await supabase.rpc('get_latest_widget_surprise');
            if (rpcErr) throw rpcErr;
            const row = Array.isArray(data) ? data[0] : data;
            if (row) {
                setLatestSurprise(row as WidgetSurprise);
                // The widget should show what the PARTNER sent.
                // Whenever the latest surprise is from the partner, push it to
                // the iOS home-screen widget via the native bridge so it updates
                // in real-time as soon as Supabase realtime fires.
                if (row.sender_id !== user?.id) {
                    setPartnerSurprise(row as WidgetSurprise);
                    const nativeAvailable = !!NativeModules.SparkWidget?.update;
                    console.log(`[useWidgetSurprise] calling native widget update — type: ${row.type}, nativeAvailable: ${nativeAvailable}`);
                    if (row.type === 'PHOTO') {
                        console.log(`[useWidgetSurprise] PHOTO URL (first 120 chars): ${row.content?.slice(0, 120)}`);
                        // Sanity-check: the URL must start with https:// to be downloadable
                        if (!row.content?.startsWith('https://')) {
                            console.warn('[useWidgetSurprise] PHOTO content is not a valid https URL — widget will not render the image');
                        }
                    }
                    NativeModules.SparkWidget?.update?.(
                        row.type,
                        row.content,
                        row.sender_name ?? 'Partner'
                    );
                    // Poll download result 3s later — visible in Metro without Xcode
                    if (row.type === 'PHOTO') {
                        setTimeout(() => {
                            NativeModules.SparkWidget?.getPhotoDebugStatus?.((status: string) => {
                                console.log(`[useWidgetSurprise] 📸 photo download status: ${status}`);
                            });
                        }, 3000);
                    }
                }
            }
        } catch (e: any) {
            console.error('[useWidgetSurprise] fetchLatest:', e);
        } finally {
            setLoading(false);
        }
    }, [user?.id]);

    // ── Fetch couple_id (space_id) once ──────────────────────────────────────

    useEffect(() => {
        if (!user) return;
        supabase
            .from('profiles')
            .select('space_id, display_name')
            .eq('id', user.id)
            .single()
            .then(({ data }) => {
                if (data?.space_id) setCoupleId(data.space_id);
                if (data?.display_name) setMyDisplayName(data.display_name);
            });
    }, [user]);

    // ── Initial fetch + Realtime subscription ─────────────────────────────────

    useEffect(() => {
        if (!user || !coupleId) return;

        fetchLatest();

        const channel = supabase
            .channel(`widget-surprises:${coupleId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'widget_surprises',
                    filter: `couple_id=eq.${coupleId}`,
                },
                async (payload) => {
                    // Re-fetch through the RPC so we get sender_name too
                    await fetchLatest();

                    // If partner sent it — update the preview immediately
                    const incoming = payload.new as any;
                    if (incoming.sender_id !== user.id) {
                        // We'll get the enriched row from fetchLatest above,
                        // but set a partial preview immediately for instant feedback
                        setPartnerSurprise((prev) =>
                            prev?.id === incoming.id
                                ? prev
                                : {
                                    id: incoming.id,
                                    type: incoming.type,
                                    content: incoming.content,
                                    sender_name: 'Partner',
                                    sender_id: incoming.sender_id,
                                    created_at: incoming.created_at,
                                }
                        );
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user, coupleId, fetchLatest]);

    // ── Core insert helper ────────────────────────────────────────────────────

    const insertSurprise = useCallback(
        async (type: SurpriseType, content: string) => {
            if (!user || !coupleId) throw new Error('Not authenticated or no partner space');

            const { error: insertErr } = await supabase.from('widget_surprises').insert({
                couple_id: coupleId,
                sender_id: user.id,
                type,
                content,
            });

            if (insertErr) throw insertErr;
        },
        [user, coupleId]
    );

    // ── sendNote ──────────────────────────────────────────────────────────────

    const sendNote = useCallback(
        async (text: string) => {
            setSending(true);
            setError(null);
            try {
                // Insert into Supabase — the partner's realtime subscription will
                // receive this and update THEIR widget via fetchLatest().
                await insertSurprise('NOTE', text.trim());
            } catch (e: any) {
                setError(e.message ?? 'Failed to send note');
                throw e;
            } finally {
                setSending(false);
            }
        },
        [insertSurprise]
    );

    // ── sendPhoto ─────────────────────────────────────────────────────────────

    const sendPhoto = useCallback(
        async (source: 'camera' | 'gallery' = 'gallery') => {
            if (!coupleId) {
                throw new Error('Still loading — please try again in a moment');
            }
            setSending(true);
            setError(null);
            try {
                // Ask for permissions
                if (source === 'camera') {
                    const { status } = await ImagePicker.requestCameraPermissionsAsync();
                    if (status !== 'granted') throw new Error('Camera permission denied');
                } else {
                    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
                    if (status !== 'granted') throw new Error('Gallery permission denied');
                }

                const result =
                    source === 'camera'
                        ? await ImagePicker.launchCameraAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.75,
                            allowsEditing: true,
                            aspect: [1, 1],
                        })
                        : await ImagePicker.launchImageLibraryAsync({
                            mediaTypes: ImagePicker.MediaTypeOptions.Images,
                            quality: 0.75,
                            allowsEditing: true,
                            aspect: [1, 1],
                        });

                if (result.canceled || !result.assets?.[0]) {
                    setSending(false);
                    return;
                }

                const asset = result.assets[0];

                // On iOS, gallery URIs can be `ph://` (PhotoKit) which expo-file-system
                // cannot read directly. Copy to a local cache file first if needed.
                let localUri = asset.uri;
                if (!localUri.startsWith('file://')) {
                    const mimeType = asset.mimeType ?? 'image/jpeg';
                    const tmpExt = mimeType.split('/')[1] ?? 'jpg';
                    const cacheDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
                    const tmpPath = `${cacheDir}widget_photo_${Date.now()}.${tmpExt}`;
                    await FileSystem.copyAsync({ from: localUri, to: tmpPath });
                    localUri = tmpPath;
                }

                // ── Compress image before upload ───────────────────────────────────────
                // Widgets have a ~30 MB memory budget. High-res photos can silently crash
                // the extension. Resize to max 1024 px wide and encode as JPEG @ 0.8.
                console.log('[sendPhoto] compressing image (pass 1: 1024px / q0.8)...');
                let compressed = await ImageManipulator.manipulateAsync(
                    localUri,
                    [{ resize: { width: 1024 } }],
                    { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
                );
                // Quick size estimate: read a tiny bit to get file existence, then use
                // base64 length after the full read. For now just always do one pass —
                // 1024px @ 0.8 JPEG is well within widget budget for most photos.
                localUri = compressed.uri;

                // Always JPEG after manipulation
                const ext = 'jpg';
                const fileName = `${user!.id}_${Date.now()}.${ext}`;

                // Read compressed local file as Base64
                console.log('[sendPhoto] reading compressed asset:', localUri);
                const base64Str = await FileSystem.readAsStringAsync(localUri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                console.log(`[sendPhoto] base64 length: ${base64Str.length} (≈${Math.round(base64Str.length * 0.75 / 1024)} KB)`);

                if (!base64Str) throw new Error('base64 read returned empty — file may be unreadable');

                const fileData = decode(base64Str);

                const { error: uploadErr } = await supabase.storage
                    .from('widget-surprises')
                    .upload(fileName, fileData, { contentType: `image/${ext}`, upsert: false });

                if (uploadErr) throw uploadErr;

                // Get a signed URL valid for 10 years (practical "permanent")
                const { data: signedData, error: signedErr } = await supabase.storage
                    .from('widget-surprises')
                    .createSignedUrl(fileName, 60 * 60 * 24 * 365 * 10);

                if (signedErr || !signedData?.signedUrl) throw signedErr ?? new Error('No signed URL');

                await insertSurprise('PHOTO', signedData.signedUrl);
                // The partner's realtime subscription will call fetchLatest()
                // which will update THEIR widget. We do NOT update our own
                // widget here — our widget shows what the partner sent to us.
            } catch (e: any) {
                console.error('[useWidgetSurprise] sendPhoto failed:', e);
                setError(e.message ?? 'Failed to send photo');
                throw e;
            } finally {
                setSending(false);
            }
        },
        [user, insertSurprise]
    );

    // ── sendReaction ─────────────────────────────────────────────────────────

    const sendReaction = useCallback(
        async (emoji: string) => {
            setSending(true);
            setError(null);
            try {
                await insertSurprise('REACTION', emoji);
                // Partner's realtime subscription handles their widget update.
            } catch (e: any) {
                setError(e.message ?? 'Failed to send reaction');
                throw e;
            } finally {
                setSending(false);
            }
        },
        [insertSurprise]
    );

    return {
        latestSurprise,
        partnerSurprise,
        loading,
        sending,
        error,
        sendNote,
        sendPhoto,
        sendReaction,
    };
}
