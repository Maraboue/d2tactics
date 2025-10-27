// src/lib/buildPhaseLookup.ts
import type { Phase } from "../components/TimedTimeline";

type ItemPopularityResponse = {
    start_game_items: Record<string, number>;
    early_game_items: Record<string, number>;
    mid_game_items: Record<string, number>;
    late_game_items: Record<string, number>;
};

export function buildPhaseLookup(pop: ItemPopularityResponse) {
    const map = new Map<string, Phase>();
    Object.keys(pop.start_game_items || {}).forEach(n => map.set(n, "start"));
    Object.keys(pop.early_game_items || {}).forEach(n => map.set(n, "early"));
    Object.keys(pop.mid_game_items || {}).forEach(n => map.set(n, "mid"));
    Object.keys(pop.late_game_items || {}).forEach(n => map.set(n, "late"));
    return (name: string): Phase | undefined => map.get(name);
}
