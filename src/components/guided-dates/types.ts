import type { Activity } from '@/src/components/date-engine/DateController';

export type Mode = 'DEEP_DIVE' | 'ENVELOPE' | 'RESONANCE';

export interface Category {
  category: string;
  scientific_basis: string;
  activities: Activity[];
}
