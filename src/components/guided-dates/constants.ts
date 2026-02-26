import { Mode } from './types';

// ── Category gradient colors ───────────────────────────────────────────────────

export const MODE_CARD_COLORS: Record<Mode, [string, string]> = {
    DEEP_DIVE: ['#1E3A8A', '#4338CA'],
    ENVELOPE: ['#92400E', '#D97706'],
    RESONANCE: ['#065F46', '#10B981'],
};

export const DEFAULT_CATEGORY_COLORS: [string, string] = ['#312E81', '#4338CA'];

export function getModeColors(mode: string): [string, string] {
    return MODE_CARD_COLORS[mode as Mode] ?? DEFAULT_CATEGORY_COLORS;
}

// ── Mode Config ───────────────────────────────────────────────────────────────

export const MODE_CONFIG: Record<Mode, { icon: string; label: string; color: string; bg: string }> = {
    DEEP_DIVE: {
        icon: 'water-outline',
        label: 'Deep Dive',
        color: '#818CF8',
        bg: 'rgba(129,140,248,0.15)',
    },
    ENVELOPE: {
        icon: 'mail-outline',
        label: 'Envelope',
        color: '#F59E0B',
        bg: 'rgba(245,158,11,0.15)',
    },
    RESONANCE: {
        icon: 'radio-outline',
        label: 'Resonance',
        color: '#34D399',
        bg: 'rgba(52,211,153,0.15)',
    },
};

// ── Time durations per mode ────────────────────────────────────────────────────

export const MODE_TIME: Record<Mode, string> = {
    DEEP_DIVE: '30m',
    ENVELOPE: '20m',
    RESONANCE: '15m',
};
