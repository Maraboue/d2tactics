package com.d2tactics.service;

import com.d2tactics.repository.HeroTagsRepository;
import com.d2tactics.repository.TagBoostsRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.util.*;

@Service
public class RecommendationService {

    private static final org.slf4j.Logger log = org.slf4j.LoggerFactory.getLogger(RecommendationService.class);


    private static final Map<String, String> PHASE_TO_JSON = Map.of(
            "start", "start_game_items",
            "early", "early_game_items",
            "mid", "mid_game_items",
            "late", "late_game_items"
    );

    private final ItemPopularityService popularity;
    private final TagBoostsRepository tagBoosts;
    private final AutoHeroTagService autoTags;

    public RecommendationService(ItemPopularityService popularity,
                                 AutoHeroTagService autoTags,
                                 TagBoostsRepository tagBoosts) {
        this.popularity = popularity;
        this.autoTags = autoTags;
        this.tagBoosts = tagBoosts;
    }


    public Mono<ObjectNode> recommendPhase(long allyId, String enemySlug, String phase, int topN) {
        final String phaseKeyJson = PHASE_TO_JSON.getOrDefault(phase, "early_game_items");
        final Set<String> tags = autoTags.tagsForHero(enemySlug);

        // DEBUG: log what we’re using
        log.info("Reco phase={}, enemySlug={}, tags={}", phase, enemySlug, tags);

        return popularity.getItemPopularityNamed(allyId)
                .map(named -> {
                    // 1) Popularity counts for this phase
                    Map<String, Integer> pop = new HashMap<>();
                    JsonNode phaseItems = named.path(phaseKeyJson);
                    if (phaseItems.isObject()) {
                        phaseItems.fieldNames().forEachRemaining(item ->
                                pop.put(item, phaseItems.get(item).asInt(0))
                        );
                    }

                    // 2) Sum boosts for enemy+phase
                    Map<String, Double> boosts = tagBoosts.boostsFor(tags, phase); // phase is start/early/mid/late
                    log.info("Boosts phase={} for {}: {}", phase, enemySlug, boosts.keySet());

                    // Sum boosts for this enemy+phase
                    Map<String, Double> boosters = tagBoosts.boostsFor(tags, phase);

// Allow boosted-only counters to appear
                    final int VIRTUAL_BASE = 25;
                    for (String item : boosters.keySet()) {
                        pop.putIfAbsent(item, VIRTUAL_BASE);
                    }

// Scoring: damp popularity, amplify boosts
                    final double GAMMA = 0.70;     // damp raw counts
                    final double BETA  = 1.50;     // boost exponent
                    final double BOOST_FLOOR = 0.20;

                    List<Map.Entry<String, Double>> scored = new ArrayList<>();
                    for (var e : pop.entrySet()) {
                        String item = e.getKey();
                        int count = e.getValue();
                        double rawBoost = boosters.getOrDefault(item, 0.0);
                        double b = rawBoost > 0 ? Math.max(rawBoost, BOOST_FLOOR) : 0.0;

                        double countTerm = Math.pow(Math.max(1, count), GAMMA);
                        double boostTerm = Math.pow(1.0 + b, BETA);
                        double score = countTerm * boostTerm;

                        scored.add(Map.entry(item, score));
                    }
                    scored.sort((a, b) -> Double.compare(b.getValue(), a.getValue()));


                    // 5) Build response (with meta to verify)
                    ObjectNode out = JsonNodeFactory.instance.objectNode()
                            .put("allyId", allyId)
                            .put("enemy", enemySlug)
                            .put("phase", phaseKeyJson);

                    ObjectNode meta = out.putObject("meta");
                    var tagsArr = meta.putArray("enemyTags");
                    tags.forEach(tagsArr::add);
                    ObjectNode applied = meta.putObject("appliedBoosts");
                    boosts.forEach(applied::put);

                    var topScores = meta.putArray("topScores");
                    for (int i = 0; i < Math.min(10, scored.size()); i++) {
                        String item = scored.get(i).getKey();
                        var row = JsonNodeFactory.instance.objectNode()
                                .put("item", item)
                                .put("score", scored.get(i).getValue())
                                .put("count", pop.getOrDefault(item, 0))
                                .put("boost", boosts.getOrDefault(item, 0.0));
                        topScores.add(row);
                    }

                    ObjectNode rec = out.putObject("recommendations");
                    int limit = Math.max(1, topN);
                    for (int i = 0; i < Math.min(limit, scored.size()); i++) {
                        String item = scored.get(i).getKey();
                        rec.put(item, pop.getOrDefault(item, 0)); // value shown is count (score is in meta)
                    }
                    return out;
                });
    }



    /** Convenience if you want all phases in one call */
    public Mono<ObjectNode> recommendAllPhases(long allyId, String enemySlug, int topN) {
        return Mono.zip(
                recommendPhase(allyId, enemySlug, "start", topN),
                recommendPhase(allyId, enemySlug, "early", topN),
                recommendPhase(allyId, enemySlug, "mid", topN),
                recommendPhase(allyId, enemySlug, "late", topN)
        ).map(t -> {
            ObjectNode root = JsonNodeFactory.instance.objectNode();
            root.set("start", t.getT1().get("recommendations"));
            root.set("early", t.getT2().get("recommendations"));
            root.set("mid", t.getT3().get("recommendations"));
            root.set("late", t.getT4().get("recommendations"));
            root.put("enemy", enemySlug);
            root.put("allyId", allyId);
            return root;
        });
    }
}
