package com.d2tactics.service;

import com.d2tactics.client.OpenDotaClient;
import com.d2tactics.repository.HeroTagsRepository;
import com.d2tactics.repository.TagRulesRepository;
import com.fasterxml.jackson.databind.JsonNode;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import com.fasterxml.jackson.databind.node.NullNode;

import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class AutoHeroTagService {
    private static final Logger log = LoggerFactory.getLogger(AutoHeroTagService.class);

    private final OpenDotaClient client;
    private final TagRulesRepository rules;
    private final HeroTagsRepository manual; // your current YAML repo

    // in-memory cache: slug -> tags
    private final Map<String, Set<String>> cache = new ConcurrentHashMap<>();
    // throttle metadata refresh
    private volatile long lastRefreshMillis = 0L;
    private volatile JsonNode heroStatsCache;       // array of heroes
    private volatile JsonNode heroAbilitiesCache;   // map slug -> ["ability_1","ability_2",...]
    private volatile JsonNode abilitiesCache;       // map ability -> details (name, desc, etc.)

    public AutoHeroTagService(OpenDotaClient client, TagRulesRepository rules, HeroTagsRepository manual) {
        this.client = client;
        this.rules = rules;
        this.manual = manual;
    }

    /** Public entry: merged manual + inferred (manual wins by union). */
    public Set<String> tagsForHero(String slug) {
        if (slug == null) return Set.of();
        slug = slug.toLowerCase(Locale.ROOT);
        // union: manual + inferred
        Set<String> merged = new HashSet<>(manual.tagsForHero(slug));
        merged.addAll(inferTags(slug));
        return merged;
    }

    /** Infer tags (cached). */
    private Set<String> inferTags(String slug) {
        return cache.computeIfAbsent(slug, s -> {
            try {
                ensureMetadata();
                Set<String> tags = new HashSet<>();
                // 1) roles -> tags
                Optional<JsonNode> hero = findHeroBySlug(slug);
                hero.ifPresent(h -> {
                    JsonNode roles = h.path("roles");
                    if (roles.isArray()) {
                        for (JsonNode r : roles) {
                            String role = r.asText();
                            var mapped = rules.roleToTags().get(role);
                            if (mapped != null) tags.addAll(mapped);
                        }
                    }
                });

                // 2) abilities -> tags via keyword matching
                List<String> abilityKeys = getHeroAbilityKeys(slug);
                Map<String, Set<String>> kw = rules.abilityKeywordToTags();
                for (String abKey : abilityKeys) {
                    JsonNode ab = abilitiesCache.path(abKey);
                    if (ab.isMissingNode()) continue;
                    String name = ab.path("dname").asText(""); // display name
                    String desc = textBlob(ab);
                    String hay = (name + " " + desc).toLowerCase(Locale.ROOT);
                    for (var e : kw.entrySet()) {
                        if (hay.contains(e.getKey())) {
                            tags.addAll(e.getValue());
                        }
                    }
                }

                // 3) optional per-hero patch
                tags.addAll(rules.patchesFor(slug));

                log.debug("Inferred tags for {} => {}", slug, tags);
                return Collections.unmodifiableSet(tags);
            } catch (Exception e) {
                log.warn("Failed inferring tags for {}: {}", slug, e.toString());
                return Set.of();
            }
        });
    }

    private void ensureMetadata() {
        long now = System.currentTimeMillis();
        if (heroStatsCache != null && (now - lastRefreshMillis) < Duration.ofMinutes(30).toMillis()) return;

        // refresh synchronously once per 30m (subsequent threads hit cached data)
        synchronized (this) {
            if (heroStatsCache != null && (now - lastRefreshMillis) < Duration.ofMinutes(30).toMillis()) return;
            JsonNode stats = client.getHeroStats().block(Duration.ofSeconds(10));
            JsonNode heroAb = client.getHeroAbilities().block(Duration.ofSeconds(10));
            JsonNode abilities = client.getAbilities().block(Duration.ofSeconds(10));
            this.heroStatsCache = stats == null ? NullNode.getInstance() : stats;
            this.heroAbilitiesCache = heroAb == null ? NullNode.getInstance() : heroAb;
            this.abilitiesCache = abilities == null ? NullNode.getInstance() : abilities;
            this.cache.clear(); // invalidate per-hero inference cache
            this.lastRefreshMillis = System.currentTimeMillis();
            log.info("AutoTag metadata refreshed: stats={}, hero_abilities={}, abilities={}",
                    arraySize(heroStatsCache), heroAbilitiesCache.size(), abilitiesCache.size());
        }
    }

    private Optional<JsonNode> findHeroBySlug(String slug) {
        if (heroStatsCache == null || !heroStatsCache.isArray()) return Optional.empty();
        for (JsonNode h : heroStatsCache) {
            // OpenDota heroStats holds "id", "localized_name", "name": "npc_dota_hero_axe"
            String name = h.path("name").asText(""); // e.g., npc_dota_hero_crystal_maiden
            String s = name.replace("npc_dota_hero_", "");
            if (slug.equals(s)) return Optional.of(h);
        }
        return Optional.empty();
    }

    private List<String> getHeroAbilityKeys(String slug) {
        JsonNode arr = heroAbilitiesCache.path(slug);
        List<String> keys = new ArrayList<>();
        if (arr.isArray()) {
            for (JsonNode n : arr) {
                String k = n.asText();
                if (!k.isBlank()) keys.add(k);
            }
        }
        return keys;
    }

    private static String textBlob(JsonNode ability) {
        StringBuilder sb = new StringBuilder();
        for (String field : List.of("desc", "dname", "lore", "notes")) {
            if (ability.has(field)) sb.append(' ').append(ability.get(field).asText(""));
        }
        return sb.toString();
    }

    private static int arraySize(JsonNode n) {
        if (n == null || !n.isArray()) return 0;
        int i = 0; for (JsonNode ignored : n) i++; return i;
    }
}
