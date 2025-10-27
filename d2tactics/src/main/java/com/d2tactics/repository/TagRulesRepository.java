// com/d2tactics/repository/TagRulesRepository.java
package com.d2tactics.repository;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger; import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class TagRulesRepository {
    private static final Logger log = LoggerFactory.getLogger(TagRulesRepository.class);

    private final Map<String, Set<String>> roleToTags;
    private final Map<String, Set<String>> abilityKeywordToTags;
    private final Map<String, Set<String>> heroPatches;

    public TagRulesRepository(@Qualifier("yamlObjectMapper") ObjectMapper yaml) {
        Map<String, Set<String>> r2t = new HashMap<>();
        Map<String, Set<String>> k2t = new HashMap<>();
        Map<String, Set<String>> patches = new HashMap<>();
        try {
            var res = new ClassPathResource("/tag-rules.yaml");
            if (!res.exists()) {
                log.warn("tag-rules.yaml not found; auto inference disabled.");
            } else {
                JsonNode root = yaml.readTree(res.getInputStream()).path("rules");
                JsonNode roles = root.path("roles_to_tags");
                roles.fieldNames().forEachRemaining(role -> {
                    Set<String> tags = new HashSet<>();
                    roles.get(role).forEach(n -> tags.add(n.asText()));
                    r2t.put(role, tags);
                });
                JsonNode ab = root.path("ability_keywords");
                ab.fieldNames().forEachRemaining(kw -> {
                    Set<String> tags = new HashSet<>();
                    ab.get(kw).forEach(n -> tags.add(n.asText()));
                    k2t.put(kw.toLowerCase(Locale.ROOT), tags);
                });
                JsonNode p = root.path("patches");
                if (!p.isMissingNode()) {
                    p.fieldNames().forEachRemaining(slug -> {
                        Set<String> tags = new HashSet<>();
                        p.get(slug).forEach(n -> tags.add(n.asText()));
                        patches.put(slug, tags);
                    });
                }
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load tag-rules.yaml", e);
        }
        roleToTags = Collections.unmodifiableMap(r2t);
        abilityKeywordToTags = Collections.unmodifiableMap(k2t);
        heroPatches = Collections.unmodifiableMap(patches);
        log.info("TagRules loaded: roles={}, abilityKeywords={}, patches={}", roleToTags.size(), abilityKeywordToTags.size(), heroPatches.size());
    }

    public Map<String, Set<String>> roleToTags() { return roleToTags; }
    public Map<String, Set<String>> abilityKeywordToTags() { return abilityKeywordToTags; }
    public Set<String> patchesFor(String slug) { return heroPatches.getOrDefault(slug, Set.of()); }
}
