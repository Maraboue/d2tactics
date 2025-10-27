package com.d2tactics.repository;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class TagBoostsRepository {

    // tag -> phase (start/early/mid/late) -> itemName -> weight
    private final Map<String, Map<String, Map<String, Double>>> boosts;

    public TagBoostsRepository(@Qualifier("yamlObjectMapper") ObjectMapper yaml) {
        try {
            var res = new ClassPathResource("/tag-item-boosts.yaml");
            JsonNode root = yaml.readTree(res.getInputStream());
            Map<String, Map<String, Map<String, Double>>> tmp = new HashMap<>();

            var tags = root.path("tag_boosts");
            tags.fieldNames().forEachRemaining(tag -> {
                Map<String, Map<String, Double>> byPhase = new HashMap<>();
                JsonNode phases = tags.get(tag);
                phases.fieldNames().forEachRemaining(phase -> {
                    Map<String, Double> items = new HashMap<>();
                    JsonNode itemNode = phases.get(phase);
                    itemNode.fieldNames().forEachRemaining(item -> {
                        items.put(item, itemNode.get(item).asDouble(0.0));
                    });
                    byPhase.put(phase, items);
                });
                tmp.put(tag, byPhase);
            });

            boosts = Collections.unmodifiableMap(tmp);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load tag-item-boosts.yaml", e);
        }
    }

    /** Sum weights of all tags for this phase for each item */
    public Map<String, Double> boostsFor(Set<String> tags, String phase) {
        Map<String, Double> sum = new HashMap<>();
        for (String tag : tags) {
            Map<String, Map<String, Double>> byPhase = boosts.get(tag);
            if (byPhase == null) continue;
            Map<String, Double> items = byPhase.get(phase);
            if (items == null) continue;
            for (var e : items.entrySet()) {
                sum.merge(e.getKey(), e.getValue(), Double::sum);
            }
        }
        return sum;
    }
}
