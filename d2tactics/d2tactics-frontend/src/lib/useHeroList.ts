import { useEffect, useState } from "react";

export type Hero = {
    id: number;
    slug: string;         // OpenDota slug, e.g. "nyx_assassin"  ← use for API calls
    key: string;          // normalized key, e.g. "nyxassassin"   ← for matching
    display: string;      // localized name, e.g. "Nyx Assassin"
    aliases: string[];    // matching helpers
};

const OPEN_DOTA = "https://api.opendota.com/api";

// "Queen of Pain" -> "queenofpain" (no spaces/punct) — for MATCHING ONLY
export function normHeroKey(s: string): string {
    return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function useHeroList() {
    const [heroes, setHeroes] = useState<Hero[]>([]);
    const [loading, setLoading] = useState(true);
    const [err, setErr] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setErr(null);
            try {
                const res = await fetch(`${OPEN_DOTA}/heroes`);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                const json = (await res.json()) as Array<{ id:number; name:string; localized_name:string }>;

                const mapped: Hero[] = json.map(h => {
                    // "npc_dota_hero_nyx_assassin" -> "nyx_assassin"
                    const slug = (h.name || "").replace("npc_dota_hero_", "");
                    const display = h.localized_name || slug.replace(/_/g, " ");
                    const key = normHeroKey(display);
                    const aliases: string[] = [];
                    aliases.push(
                        key,                          // nyxassassin
                        display.toLowerCase(),        // "nyx assassin"
                        display.toLowerCase().replace(/\s+/g, "-"), // nyx-assassin
                        slug                          // nyx_assassin
                    );
                    return { id: h.id, slug, key, display, aliases: Array.from(new Set(aliases)) };
                });

                if (!cancelled) setHeroes(mapped);
            } catch (e:any) {
                if (!cancelled) setErr(e?.message ?? "Failed to load heroes");
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, []);

    return { heroes, loading, err };
}
