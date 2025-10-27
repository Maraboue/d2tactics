import { inferChains, type Chain, type ItemPopularityResponse } from "./inferOrder";

/** Take the first N chains as “variants” (simple & robust).
 *  Later we can switch to co-occurrence clustering without touching the UI. */
export function inferVariants(
    data: ItemPopularityResponse,
    topKPerPhase = 6,
    maxVariants = 3
): Chain[] {
    const chains = inferChains(data, topKPerPhase);
    return chains.slice(0, Math.max(1, maxVariants));
}
