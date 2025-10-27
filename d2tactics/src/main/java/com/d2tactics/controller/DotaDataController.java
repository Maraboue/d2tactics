package com.d2tactics.controller;

import com.d2tactics.service.ItemPopularityService;
import com.d2tactics.service.OpenDotaHeroService;
import com.d2tactics.util.HeroIdMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.Set;

@RestController
@RequestMapping(value = "/opendota/data/", produces = MediaType.APPLICATION_JSON_VALUE)
public class DotaDataController {

    private static final Set<String> PHASES = Set.of(
            "start_game_items", "early_game_items", "mid_game_items", "late_game_items"
    );

    private final OpenDotaHeroService heroService;
    private final ItemPopularityService itemPopularityService;

    public DotaDataController(OpenDotaHeroService heroService,
                              ItemPopularityService itemPopularityService) {
        this.heroService = heroService;
        this.itemPopularityService = itemPopularityService;
    }

    /**
     * Simple recommendations: top-N popular items for your hero in a given phase.
     * Later we can actually use the enemy hero to bias the list (counter logic).
     *
     * Example:
     *   GET /opendota/recommend?ally=axe&enemy=zeus&phase=early&top=4
     */
    @GetMapping("/recommend")
    public Mono<ResponseEntity<JsonNode>> recommend(
            @RequestParam String ally,
            @RequestParam String enemy, // captured for future countering logic
            @RequestParam(defaultValue = "early") String phase,
            @RequestParam(defaultValue = "4") int top
    ) {
        // map phase to the popularity key
        final String phaseKey;
        switch (phase.toLowerCase()) {
            case "start", "starting", "lane" -> phaseKey = "start_game_items";
            case "early" -> phaseKey = "early_game_items";
            case "mid", "midgame" -> phaseKey = "mid_game_items";
            case "late", "lategame" -> phaseKey = "late_game_items";
            default -> {
                ObjectNode err = JsonNodeFactory.instance.objectNode()
                        .put("error", "Invalid phase")
                        .put("hint", "Use one of: start, early, mid, late");
                return Mono.just(ResponseEntity.badRequest().body(err));
            }
        }

        Long allyId = resolveHeroId(ally);
        Long enemyId = resolveHeroId(enemy); // not used yet, but reserved for future logic

        if (allyId == null || enemyId == null) {
            ObjectNode err = JsonNodeFactory.instance.objectNode()
                    .put("error", "Unknown hero")
                    .put("hint", "Check ally/enemy names or use numeric IDs");
            return Mono.just(ResponseEntity.badRequest().body(err));
        }

        // get ally popularity (named) and pick top-N for the requested phase
        return itemPopularityService.getItemPopularityNamed(allyId)
                .map(pop -> {
                    JsonNode phaseNode = pop.get(phaseKey);
                    ObjectNode body = JsonNodeFactory.instance.objectNode();
                    body.put("ally", ally);
                    body.put("enemy", enemy);
                    body.put("phase", phaseKey);

                    ObjectNode rec = body.putObject("recommendations");
                    if (phaseNode != null && phaseNode.isObject()) {
                        var fields = phaseNode.fields();
                        java.util.List<java.util.Map.Entry<String, JsonNode>> list = new java.util.ArrayList<>();
                        while (fields.hasNext()) list.add(fields.next());
                        list.sort((a, b) -> Integer.compare(b.getValue().asInt(0), a.getValue().asInt(0)));

                        int limit = Math.max(1, top);
                        for (int i = 0; i < Math.min(limit, list.size()); i++) {
                            var e = list.get(i);
                            rec.put(e.getKey(), e.getValue().asInt(0));
                        }
                    }

                    return ResponseEntity.ok((JsonNode) body); // ✅ FIX
                })
                .onErrorResume(ex -> {
                    ObjectNode err = JsonNodeFactory.instance.objectNode()
                            .put("error", ex.getClass().getSimpleName())
                            .put("message", ex.getMessage() == null ? "Upstream failure" : ex.getMessage());
                    return Mono.just(ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err)); // ✅ also cast here
                });

    }


    @GetMapping("/heroes/{hero}/itemPopularity")
    public Mono<ResponseEntity<JsonNode>> getItemPopularity(
            @PathVariable String hero,
            @RequestParam(value = "phase", required = false) String phase,
            @RequestParam(value = "named", defaultValue = "false") boolean named
    ) {
        Long heroId = resolveHeroId(hero);
        if (heroId == null) {
            return badRequest("Unknown hero: " + hero);
        }
        if (phase != null && !PHASES.contains(phase)) {
            return badRequest("Invalid phase: " + phase);
        }

        Mono<JsonNode> dataMono = named
                ? itemPopularityService.getItemPopularityNamed(heroId)
                : heroService.fetchHeroItemPopularity(heroId);

        Mono<JsonNode> shaped = (phase == null)
                ? dataMono
                : dataMono.map(json -> {
            var node = json.get(phase);
            if (node == null) return json; // shouldn’t happen if phase validated
            ObjectNode wrapper = JsonNodeFactory.instance.objectNode();
            wrapper.set(phase, node);
            return wrapper;
        });

        // Ensure we never “hang”: timeout + JSON error mapping
        return shaped
                .timeout(Duration.ofSeconds(6))
                .map(ResponseEntity::ok)
                .onErrorResume(ex -> {
                    ObjectNode err = JsonNodeFactory.instance.objectNode()
                            .put("error", ex.getClass().getSimpleName())
                            .put("message", ex.getMessage() == null ? "Upstream failure" : ex.getMessage());
                    return Mono.just(ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(err));
                });
    }

    private Mono<ResponseEntity<JsonNode>> badRequest(String message) {
        ObjectNode err = JsonNodeFactory.instance.objectNode().put("error", message);
        return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body(err));
    }

    private Long resolveHeroId(String hero) {
        Long id = HeroIdMapper.getHeroId(hero); // supports names like "axe"
        if (id != null) return id;
        try { return Long.parseLong(hero); } catch (NumberFormatException ignored) { return null; }
    }


    // quick probe so you can confirm routing works
    @GetMapping("/ping")
    public Mono<JsonNode> ping() {
        ObjectNode ok = JsonNodeFactory.instance.objectNode().put("status","ok");
        return Mono.just(ok);
    }
}
