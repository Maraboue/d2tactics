// src/lib/useItemIcons.ts
import { useEffect, useMemo, useState } from "react";

// Primary base for /constants/items "img" paths
const STEAM_CDN = "https://cdn.cloudflare.steamstatic.com";
// Fallback classic path (older style)
const CLASSIC_ITEMS_CDN = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items";

// Fetch OpenDota constants and build name -> url map
async function fetchItemConstants(): Promise<Record<string, string>> {
    const res = await fetch("https://api.opendota.com/api/constants/items");
    if (!res.ok) throw new Error(`Failed to fetch constants: ${res.status}`);
    const json = await res.json();

    // json is { <shortname>: { dname, img, ... }, ... }
    const map: Record<string, string> = {};

    for (const key of Object.keys(json)) {
        const item = json[key];
        const dname = item?.dname as string | undefined;       // display name, e.g. "Sage's Mask"
        const imgPath = item?.img as string | undefined;       // e.g. "/apps/dota2/images/dota_react/items/quelling_blade.png"
        if (!dname || !imgPath) continue;

        // normalize display name as key (exact match)
        map[dname] = `${STEAM_CDN}${imgPath}`;
    }

    return map;
}

// simple slugify for fallback classic CDN
function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/&/g, "and")
        .replace(/['".,]/g, "")
        .replace(/\s+/g, "_");
}

/**
 * Hook that returns a stable getItemIcon(name) function.
 * It tries OpenDota constants first; if missing, falls back to classic slug path.
 */
export function useItemIcons() {
    const [byName, setByName] = useState<Record<string, string>>({});
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let cancelled = false;
        fetchItemConstants()
            .then((m) => { if (!cancelled) { setByName(m); setReady(true); } })
            .catch(() => { if (!cancelled) setReady(true); }); // still allow fallbacks
        return () => { cancelled = true; };
    }, []);

    const getItemIcon = useMemo(() => {
        return (displayName: string | undefined): string | undefined => {
            if (!displayName) return undefined;

            // 1) exact match by display name from constants
            const url = byName[displayName];
            if (url) return url;

            // 2) fallback to classic CDN slug (works for many items)
            const slug = slugify(displayName);
            return `${CLASSIC_ITEMS_CDN}/${slug}_lg.png`;
        };
    }, [byName]);

    return { getItemIcon, ready };
}
