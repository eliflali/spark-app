import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// ── Configure how notifications appear when the app is in the foreground ──────
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

// ── IDs so we can avoid re-scheduling every launch ───────────────────────────
const SPARK_NOTIF_ID_KEY = 'spark-daily-notif';
const VIBE_NOTIF_ID_KEY = 'vibe-daily-notif';

async function requestPermissions(): Promise<boolean> {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    if (existingStatus === 'granted') return true;

    const { status } = await Notifications.requestPermissionsAsync();
    return status === 'granted';
}

async function scheduleIfNeeded(
    identifier: string,
    hour: number,
    minute: number,
    title: string,
    body: string
) {
    // Check if this notification is already scheduled
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    const alreadyScheduled = scheduled.some((n) => n.identifier === identifier);
    if (alreadyScheduled) return;

    await Notifications.scheduleNotificationAsync({
        identifier,
        content: {
            title,
            body,
            sound: 'default',
        },
        trigger: {
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
            hour,
            minute,
        },
    });

    console.log(`[Notifications] Scheduled "${title}" daily at ${hour}:${String(minute).padStart(2, '0')}`);
}

export function useScheduledNotifications() {
    useEffect(() => {
        (async () => {
            const granted = await requestPermissions();
            if (!granted) {
                console.log('[Notifications] Permission denied — skipping scheduling');
                return;
            }

            // 1pm — Daily Spark question
            await scheduleIfNeeded(
                SPARK_NOTIF_ID_KEY,
                13, // 1 pm local time
                0,
                "Today's Spark 🔥",
                "Your daily question is ready. What will you discover about each other today?"
            );

            // 2pm — Daily Vibe check / date matchmaker
            await scheduleIfNeeded(
                VIBE_NOTIF_ID_KEY,
                14, // 2 pm local time
                0,
                "Find Your Daily Vibe ✦",
                "What kind of connection do you want today? Let Spark find your perfect date."
            );
        })();
    }, []);
}
