package com.d2tactics.controller;

import com.d2tactics.service.RecommendationService;
import com.d2tactics.util.HeroIdMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Locale;

@RestController
@RequestMapping(value = "/opendota/recommendation/", produces = MediaType.APPLICATION_JSON_VALUE)
public class RecommendationController {

    private final RecommendationService recommendationService;

    public RecommendationController(RecommendationService recommendationService) {
        this.recommendationService = recommendationService;
    }

    @GetMapping("/recommend")
    public Mono<ResponseEntity<JsonNode>> recommend(
            @RequestParam String ally,
            @RequestParam String enemy,
            @RequestParam(required = false) String phase,
            @RequestParam(defaultValue = "6") int top
    ) {
        Long allyId = resolveHeroId(ally);
        if (allyId == null) return badRequest("Unknown ally: " + ally);

        String enemySlug = canonicalizeHeroSlug(enemy);
        if (enemySlug == null || enemySlug.isBlank()) return badRequest("Missing enemy slug");

        Mono<JsonNode> body = (phase == null || phase.isBlank())
                ? recommendationService.recommendAllPhases(allyId, enemySlug, top).map(n -> (JsonNode) n)
                : recommendationService.recommendPhase(allyId, enemySlug, phase.toLowerCase(Locale.ROOT), top).map(n -> (JsonNode) n);

        return body
                .map(ResponseEntity::ok)
                .onErrorResume(ex -> {
                    var err = JsonNodeFactory.instance.objectNode()
                            .put("error", ex.getClass().getSimpleName())
                            .put("message", ex.getMessage() == null ? "Upstream failure" : ex.getMessage());
                    return Mono.just(ResponseEntity.status(HttpStatus.BAD_GATEWAY).body((JsonNode) err));
                });
    }


    private Mono<ResponseEntity<JsonNode>> badRequest(String message) {
        ObjectNode err = JsonNodeFactory.instance.objectNode().put("error", message);
        return Mono.just(ResponseEntity.status(HttpStatus.BAD_REQUEST).body((JsonNode) err));
    }

    private Long resolveHeroId(String hero) {
        if (hero == null) return null;
        Long id = HeroIdMapper.getHeroId(hero);
        if (id != null) return id;
        try {
            return Long.parseLong(hero);
        } catch (NumberFormatException ignored) {
            return null;
        }
    }

    private String canonicalizeHeroSlug(String input) {
        if (input == null) return null;
        String normalized = input.trim().toLowerCase(Locale.ROOT).replace(' ', '_');
        // Try to resolve to ID first (handles variants like “Doom” vs “doom_bringer”)
        Long id = resolveHeroId(normalized);
        if (id != null) {
            String slug = HeroIdMapper.getSlugById(id);
            if (slug != null && !slug.isBlank()) return slug;   // <-- canonical slug from your map
        }
        // Fallback: normalized
        return normalized;
    }

}
