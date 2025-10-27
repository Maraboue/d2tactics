import type { ItemPopularityResponse } from "./inferOrder";

type Timing = { minute: number; uses: number };
export type TimingsMap = Record<string, Timing>;

/** Phase → representative minutes (tweak freely) */
const PHASE_MINUTES: Record<keyof ItemPopularityResponse, number> = {
    start_game_items: 2,
    early_game_items: 8,
    mid_game_items: 20,
    late_game_items: 35,
};

/** Build “fake” timings from phase popularity (so the UI always draws a time axis) */
export function buildSyntheticTimings(pop: ItemPopularityResponse, topPerPhase = 10): TimingsMap {
    const out: TimingsMap = {};
    (Object.keys(pop) as (keyof ItemPopularityResponse)[]).forEach(phaseKey => {
        const minutes = PHASE_MINUTES[phaseKey];
        const entries = Object.entries(pop[phaseKey] || {}).sort((a, b) => b[1] - a[1]).slice(0, topPerPhase);
        entries.forEach(([name, count], idx) => {
            // tiny staggering so equal-minute items don’t overlap
            const minute = minutes + idx * 0.3;
            out[name] = { minute, uses: count };
        });
    });
    return out;
}
