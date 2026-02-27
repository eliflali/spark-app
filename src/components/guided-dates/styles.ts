import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
    // Card
    card: {
        width: 140,
        height: 150,
        borderRadius: 24,
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
        overflow: 'hidden',
    },
    cardBase: {
        backgroundColor: '#0F172A',
        borderRadius: 24,
    },
    cardContent: {
        flex: 1,
        padding: 14,
        justifyContent: 'space-between',
    },
    cardTopRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    modeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 0.5,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modeBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    cardBottom: {
        gap: 10,
    },
    cardTitle: {
        color: '#FFFFFF',
        fontSize: 15,
        fontWeight: '700',
        letterSpacing: -0.2,
        lineHeight: 21,
    },
    timePill: {
        alignSelf: 'flex-start',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.12)',
        borderWidth: 0.5,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    timePillText: {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.3,
    },
});
