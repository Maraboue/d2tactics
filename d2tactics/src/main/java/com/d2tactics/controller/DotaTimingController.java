package com.d2tactics.controller;

import com.d2tactics.service.ItemTimingService;
import com.d2tactics.util.HeroIdMapper;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

@RestController
@RequestMapping(value = "/opendota", produces = MediaType.APPLICATION_JSON_VALUE)
public class DotaTimingController {

    private final ItemTimingService timing;

    public DotaTimingController(ItemTimingService timing) {
        this.timing = timing;
    }

    @GetMapping("/heroes/{hero}/itemTimings")
    public Mono<ResponseEntity<JsonNode>> timings(@PathVariable String hero,
                                                  @RequestParam(defaultValue = "8") int minCount,
                                                  @RequestParam(defaultValue = "60") int limit) {
        Long heroId = resolveHeroId(hero);
        if (heroId == null) {
            ObjectNode err = JsonNodeFactory.instance.objectNode().put("error", "Unknown hero: " + hero);
            return Mono.just(ResponseEntity.badRequest().body(err));
        }
        return timing.medianTimings(heroId, minCount, limit)
                .map(ResponseEntity::ok)
                .onErrorResume(e -> Mono.just(ResponseEntity.ok(JsonNodeFactory.instance.objectNode()))); // {}
    }


    private Long resolveHeroId(String hero) {
        Long id = HeroIdMapper.getHeroId(hero);
        if (id != null) return id;
        try { return Long.parseLong(hero); } catch (Exception e) { return null; }
    }
}
