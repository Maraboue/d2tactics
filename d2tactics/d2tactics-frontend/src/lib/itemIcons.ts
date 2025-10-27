// src/lib/itemIcons.ts
// Real Dota 2 item image mapping using Valve CDN.
// Pattern: https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/<slug>_lg.png

const NAME_TO_SLUG: Record<string, string> = {
    // common early/start items
    "Quelling Blade": "quelling_blade",
    "Gauntlets of Strength": "gauntlets",
    "Iron Branch": "branches",
    "Circlet": "circlet",
    "Sage's Mask": "sobi_mask",
    "Boots of Speed": "boots",
    "Magic Stick": "magic_stick",
    "Magic Wand": "magic_wand",
    "Clarity": "clarity",
    "Observer Ward": "ward_observer",
    "Sentry Ward": "ward_sentry",
    "Tango": "tango",
    "Smoke of Deceit": "smoke_of_deceit",
    "Enchanted Mango": "enchanted_mango",
    "Observer and Sentry Wards": "ward_dispenser",
    "Faerie Fire": "faerie_fire",
    "Wind Lace": "wind_lace",
    "Blood Grenade": "blood_grenade",

    // mid/late items
    "Blink Dagger": "blink",
    "Vanguard": "vanguard",
    "Blade Mail": "blade_mail",
    "Black King Bar": "black_king_bar",
    "Assault Cuirass": "assault",
    "Heart of Tarrasque": "heart",
    "Phase Boots": "phase_boots",
    "Power Treads": "power_treads",
    "Arcane Boots": "arcane_boots",
    "Guardian Greaves": "guardian_greaves",
    "Lotus Orb": "lotus_orb",
    "Hood of Defiance": "hood_of_defiance",
    "Pipe of Insight": "pipe",
    "Crimson Guard": "crimson_guard",
    "Radiance": "radiance",
    "Shiva's Guard": "shivas_guard",
    "Heaven's Halberd": "heavens_halberd",
    "Abyssal Blade": "abyssal_blade",
    "Satanic": "satanic",
    "Linken's Sphere": "linkens_sphere",
    "Octarine Core": "octarine_core",
    "Daedalus": "greater_crit",
    "Butterfly": "butterfly",
    "Mjollnir": "mjollnir",
    "Desolator": "desolator",
    "Monkey King Bar": "monkey_king_bar",
    "Aghanim's Scepter": "ultimate_scepter",
    "Aghanim's Shard": "aghanims_shard",
    "Refresher Orb": "refresher",
};

export function itemIconUrl(name: string): string | undefined {
    const slug = NAME_TO_SLUG[name];
    if (!slug) return undefined;
    // use Valve CDN (Cloudflare edge)
    return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/items/${slug}_lg.png`;
}
