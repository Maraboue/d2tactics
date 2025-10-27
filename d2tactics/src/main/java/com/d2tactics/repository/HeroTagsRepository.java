package com.d2tactics.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class HeroTagsRepository {

    private final Map<String, Set<String>> heroToTags;

    public HeroTagsRepository(@Qualifier("yamlObjectMapper") ObjectMapper yaml) {
        try {
            var res = new ClassPathResource("/hero-tags.yaml");
            JsonNode root = yaml.readTree(res.getInputStream());
            Map<String, Set<String>> map = new HashMap<>();
            var obj = root.path("hero_tags");
            obj.fieldNames().forEachRemaining(slug -> {
                Set<String> tags = new HashSet<>();
                obj.get(slug).forEach(n -> tags.add(n.asText()));
                map.put(slug, tags);
            });
            heroToTags = Collections.unmodifiableMap(map);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load hero-tags.yaml", e);
        }
    }

    /** Returns lowercased slug key set or empty set */
    public Set<String> tagsForHero(String heroSlug) {
        if (heroSlug == null) return Set.of();
        return heroToTags.getOrDefault(heroSlug.toLowerCase(Locale.ROOT), Set.of());
    }
}
