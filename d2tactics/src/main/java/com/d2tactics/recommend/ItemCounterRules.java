// com/d2tactics/d2tactics/recommend/ItemCounterRules.java
package com.d2tactics.recommend;


import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.InputStream;
import java.util.*;

@Component
public class ItemCounterRules {

    private final RulesModel rules;

    public ItemCounterRules() {
        try (InputStream in = new ClassPathResource("item-counters.yaml").getInputStream()) {
            ObjectMapper yaml = new ObjectMapper(new YAMLFactory());
            this.rules = yaml.readValue(in, RulesModel.class);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load item-counters.yaml", e);
        }
    }

    /** Normalize hero key: lowercase, remove spaces, apostrophes, punctuation */
    public static String normHero(String s) {
        if (s == null) return null;
        return s.toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9]", "");
    }

    public Set<String> tagsForHero(String heroNameOrKey) {
        String key = normHero(heroNameOrKey);
        if (key == null || rules.getHero_tags() == null) return Collections.emptySet();
        List<String> tags = rules.getHero_tags().get(key);
        return tags == null ? Collections.emptySet() : new LinkedHashSet<>(tags);
    }

    public List<ItemSuggestion> itemsForThreats(Set<String> threats) {
        if (threats == null || threats.isEmpty() || rules.getThreats() == null) return List.of();
        Map<String, ItemSuggestion> acc = new LinkedHashMap<>();

        for (String threat : threats) {
            var t = rules.getThreats().get(threat);
            if (t == null || t.getItems() == null) continue;
            for (var ti : t.getItems()) {
                ItemSuggestion s = acc.computeIfAbsent(ti.getName(), ItemSuggestion::new);
                s.addReason(ti.getReason()).addThreat(threat);
            }
        }
        return new ArrayList<>(acc.values());
    }
}
