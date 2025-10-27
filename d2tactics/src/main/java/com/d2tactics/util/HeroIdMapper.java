package com.d2tactics.util;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

/**
 * Static mapping of Dota 2 hero names (lowercase, underscores) to their OpenDota hero IDs.
 *
 * Source: https://docs.opendota.com/#tag/heroes
 * Example usage:
 *   Long id = HeroIdMapper.getHeroId("axe"); // returns 2
 */
public final class HeroIdMapper {

    private static final Map<String, Long> HERO_NAME_TO_ID;
    private static final Map<Long, String> ID_TO_SLUG;

    static {
        Map<String, Long> map = new HashMap<>();

        // --- Core Heroes ---
        map.put("antimage", 1L);
        map.put("axe", 2L);
        map.put("bane", 3L);
        map.put("bloodseeker", 4L);
        map.put("crystal_maiden", 5L);
        map.put("drow_ranger", 6L);
        map.put("earthshaker", 7L);
        map.put("juggernaut", 8L);
        map.put("mirana", 9L);
        map.put("morphling", 10L);
        map.put("shadow_fiend", 11L);
        map.put("phantom_lancer", 12L);
        map.put("puck", 13L);
        map.put("pudge", 14L);
        map.put("razor", 15L);
        map.put("sand_king", 16L);
        map.put("storm_spirit", 17L);
        map.put("sven", 18L);
        map.put("tiny", 19L);
        map.put("vengeful_spirit", 20L);
        map.put("windranger", 21L);
        map.put("zeus", 22L);
        map.put("kunkka", 23L);
        map.put("lina", 25L);
        map.put("lion", 26L);
        map.put("shadow_shaman", 27L);
        map.put("slardar", 28L);
        map.put("tidehunter", 29L);
        map.put("witch_doctor", 30L);
        map.put("lich", 31L);
        map.put("riki", 32L);
        map.put("enigma", 33L);
        map.put("tinker", 34L);
        map.put("sniper", 35L);
        map.put("necrolyte", 36L);
        map.put("warlock", 37L);
        map.put("beastmaster", 38L);
        map.put("queenofpain", 39L);
        map.put("venomancer", 40L);
        map.put("faceless_void", 41L);
        map.put("skeleton_king", 42L);
        map.put("death_prophet", 43L);
        map.put("phantom_assassin", 44L);
        map.put("pugna", 45L);
        map.put("templar_assassin", 46L);
        map.put("viper", 47L);
        map.put("luna", 48L);
        map.put("dragon_knight", 49L);
        map.put("dazzle", 50L);
        map.put("rattletrap", 51L);
        map.put("leshrac", 52L);
        map.put("furion", 53L);
        map.put("life_stealer", 54L);
        map.put("dark_seer", 55L);
        map.put("clinkz", 56L);
        map.put("omniknight", 57L);
        map.put("enchantress", 58L);
        map.put("huskar", 59L);
        map.put("night_stalker", 60L);
        map.put("broodmother", 61L);
        map.put("bounty_hunter", 62L);
        map.put("weaver", 63L);
        map.put("jakiro", 64L);
        map.put("batrider", 65L);
        map.put("chen", 66L);
        map.put("spectre", 67L);
        map.put("doom_bringer", 69L);
        map.put("ancient_apparition", 68L);
        map.put("ursa", 70L);
        map.put("spirit_breaker", 71L);
        map.put("gyrocopter", 72L);
        map.put("alchemist", 73L);
        map.put("invoker", 74L);
        map.put("silencer", 75L);
        map.put("obsidian_destroyer", 76L);
        map.put("lycan", 77L);
        map.put("brewmaster", 78L);
        map.put("shadow_demon", 79L);
        map.put("lone_druid", 80L);
        map.put("chaos_knight", 81L);
        map.put("meepo", 82L);
        map.put("treant", 83L);
        map.put("ogre_magi", 84L);
        map.put("undying", 85L);
        map.put("rubick", 86L);
        map.put("disruptor", 87L);
        map.put("nyx_assassin", 88L);
        map.put("naga_siren", 89L);
        map.put("keeper_of_the_light", 90L);
        map.put("wisp", 91L);
        map.put("visage", 92L);
        map.put("slark", 93L);
        map.put("medusa", 94L);
        map.put("troll_warlord", 95L);
        map.put("centaur", 96L);
        map.put("magnataur", 97L);
        map.put("shredder", 98L);
        map.put("bristleback", 99L);
        map.put("tusk", 100L);
        map.put("skywrath_mage", 101L);
        map.put("abaddon", 102L);
        map.put("elder_titan", 103L);
        map.put("legion_commander", 104L);
        map.put("techies", 105L);
        map.put("ember_spirit", 106L);
        map.put("earth_spirit", 107L);
        map.put("abyssal_underlord", 108L);
        map.put("terrorblade", 109L);
        map.put("phoenix", 110L);
        map.put("oracle", 111L);
        map.put("winter_wyvern", 112L);
        map.put("arc_warden", 113L);
        map.put("monkey_king", 114L);
        map.put("pangolier", 120L);
        map.put("dark_willow", 119L);
        map.put("grimstroke", 121L);
        map.put("hoodwink", 123L);
        map.put("void_spirit", 126L);
        map.put("snapfire", 128L);
        map.put("mars", 129L);
        map.put("dawnbreaker", 135L);
        map.put("marci", 136L);
        map.put("primal_beast", 137L);
        map.put("muerta", 138L);

        HERO_NAME_TO_ID = Collections.unmodifiableMap(map);
        Map<Long, String> rev = new HashMap<>();
        for (var e : map.entrySet()) {
            rev.put(e.getValue(), e.getKey());
        }
        ID_TO_SLUG = Collections.unmodifiableMap(rev);
    }

    private HeroIdMapper() {
        // Utility class, no instantiation
    }

    /** Gets the hero ID for a given name (case-insensitive). */
    public static Long getHeroId(String name) {
        if (name == null) return null;
        return HERO_NAME_TO_ID.get(name.toLowerCase().replace(" ", "_"));
    }

    public static String getSlugById(Long id) {      // NEW
        if (id == null) return null;
        return ID_TO_SLUG.get(id);
    }

    /** Returns an unmodifiable view of the entire map. */
    public static Map<String, Long> all() {
        return HERO_NAME_TO_ID;
    }


}
