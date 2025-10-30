// src/api/opendota.ts
export type PhaseKey = "start_game_items" | "early_game_items" | "mid_game_items" | "late_game_items";
export type PopularityMap = Record<string, number>;
export type ItemPopularityResponse = Record<PhaseKey, PopularityMap>;

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export async function fetchItemPopularity(
    hero: string,
    opts: { named?: boolean; phase?: PhaseKey } = { named: true }
): Promise<ItemPopularityResponse | Record<PhaseKey, PopularityMap>> {
    const params = new URLSearchParams();
    if (opts.named) params.set("named", "true");
    if (opts.phase) params.set("phase", opts.phase);
    const res = await fetch(`${BASE}/opendota/heroes/${encodeURIComponent(hero)}/itemPopularity?${params}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
    return res.json();
}
