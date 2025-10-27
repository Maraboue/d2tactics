// Simple rank-following chain inference across phases.
// Start with topK seeds from "start" and continue rank r to r across phases.
export type PhaseKey = "start_game_items" | "early_game_items" | "mid_game_items" | "late_game_items";
export type PopularityMap = Record<string, number>;
export type ItemPopularityResponse = Record<PhaseKey, PopularityMap>;

const ORDER: PhaseKey[] = ["start_game_items", "early_game_items", "mid_game_items", "late_game_items"];

export type ChainStep = {
    phase: PhaseKey;
    name: string;
    count: number;
    rank: number;     // rank inside its phase (0-based)
    stepIndex: number; // sequential index in the chain (0..3 typically)
};

export type Chain = ChainStep[];

function sortPhase(items: PopularityMap): [name: string, count: number][] {
    const arr = Object.entries(items || {});
    arr.sort((a, b) => b[1] - a[1]);
    return arr;
}

/**
 * Build chains by taking the topK from Start and continuing the same rank across phases.
 * If a target phase has fewer than (rank+1) items, we pick the closest existing index.
 */
export function inferChains(data: ItemPopularityResponse, topK = 6): Chain[] {
    const sorted: Record<PhaseKey, [string, number][]> = {
        start_game_items: sortPhase(data.start_game_items),
        early_game_items: sortPhase(data.early_game_items),
        mid_game_items: sortPhase(data.mid_game_items),
        late_game_items: sortPhase(data.late_game_items),
    };

    const start = sorted.start_game_items;
    const chains: Chain[] = [];

    const seeds = Math.min(topK, start.length);
    for (let r = 0; r < seeds; r++) {
        const chain: Chain = [];
        let stepIndex = 0;

        for (const phase of ORDER) {
            const list = sorted[phase];
            if (!list.length) continue;

            // choose the item at same rank if possible, fall back to nearest valid index
            let idx = r;
            if (idx >= list.length) idx = list.length - 1; // nearest lower
            const [name, count] = list[idx];

            // Avoid immediate duplicates inside the chain if the same item repeats from prev phase
            if (chain.length && chain[chain.length - 1].name === name) {
                // try neighbor (+1 or -1)
                const tryIdx = Math.min(list.length - 1, idx + 1);
                const [altName, altCount] = list[tryIdx];
                if (altName !== name) {
                    chain.push({ phase, name: altName, count: altCount, rank: tryIdx, stepIndex });
                    stepIndex++;
                    continue;
                }
            }

            chain.push({ phase, name, count, rank: idx, stepIndex });
            stepIndex++;
        }

        if (chain.length) chains.push(chain);
    }

    return chains;
}
