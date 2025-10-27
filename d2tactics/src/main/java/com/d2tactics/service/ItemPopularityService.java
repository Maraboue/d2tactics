package com.d2tactics.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.core.publisher.Mono;

import java.util.Iterator;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class ItemPopularityService {

    private static final String[] PHASES = {
            "start_game_items", "early_game_items", "mid_game_items", "late_game_items"
    };

    private final OpenDotaHeroService heroService;
    private final WebClient openDota; // for /constants/items
    private final Mono<Map<Integer, String>> itemIdToNameCache;

    public ItemPopularityService(OpenDotaHeroService heroService) {
        this.heroService = heroService;

        // WebClient with larger in-memory buffer for /constants/items (default is 256 KB)
        ExchangeStrategies strategies = ExchangeStrategies.builder()
                .codecs(c -> c.defaultCodecs().maxInMemorySize(8 * 1024 * 1024)) // 8 MB
                .build();

        this.openDota = WebClient.builder()
                .baseUrl("https://api.opendota.com/api")
                .exchangeStrategies(strategies)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .build();

        // cache the item map for the life of the app
        this.itemIdToNameCache = fetchItemMap().cache();
    }

    /** Controller uses this when ?named=true */
    public Mono<JsonNode> getItemPopularityNamed(Long heroId) {
        return Mono.zip(
                heroService.fetchHeroItemPopularity(heroId), // Json: phases with itemId->count
                itemIdToNameCache                            // Map<Integer,String>
        ).map(tuple -> {
            JsonNode raw = tuple.getT1();
            Map<Integer, String> id2name = tuple.getT2();

            ObjectNode root = JsonNodeFactory.instance.objectNode();

            for (String phase : PHASES) {
                JsonNode phaseNode = raw.get(phase);
                ObjectNode named = JsonNodeFactory.instance.objectNode();

                if (phaseNode != null && phaseNode.isObject()) {
                    Iterator<Map.Entry<String, JsonNode>> it = phaseNode.fields();
                    while (it.hasNext()) {
                        Map.Entry<String, JsonNode> e = it.next();
                        String idStr = e.getKey();
                        int count = e.getValue().asInt(0);
                        Integer itemId;
                        try { itemId = Integer.valueOf(idStr); } catch (NumberFormatException ex) { continue; }
                        String display = id2name.getOrDefault(itemId, "item#" + itemId);
                        named.put(display, count);
                    }
                }
                root.set(phase, named);
            }
            return root; // ← JSON object, NOT String
        });
    }

    /** Build reverse map: itemId -> display name from /constants/items */
    private Mono<Map<Integer, String>> fetchItemMap() {
        return openDota.get()
                .uri("/constants/items")
                .retrieve()
                .bodyToMono(JsonNode.class)
                .map(json -> {
                    Map<Integer, String> map = new ConcurrentHashMap<>();
                    if (json != null && json.isObject()) {
                        Iterator<Map.Entry<String, JsonNode>> it = json.fields();
                        while (it.hasNext()) {
                            Map.Entry<String, JsonNode> e = it.next();
                            JsonNode node = e.getValue();
                            if (node == null || !node.isObject()) continue;

                            int id = node.path("id").asInt(-1);
                            if (id < 0) continue;

                            String display = node.path("dname").asText(null);
                            if (display == null || display.isBlank()) {
                                display = prettifySlug(e.getKey());
                            }
                            map.put(id, display);
                        }
                    }
                    return map;
                });
    }

    private static String prettifySlug(String slug) {
        if (slug == null || slug.isBlank()) return slug;
        String[] parts = slug.split("_");
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < parts.length; i++) {
            String p = parts[i];
            if (!p.isEmpty()) {
                sb.append(Character.toUpperCase(p.charAt(0)));
                if (p.length() > 1) sb.append(p.substring(1));
            }
            if (i < parts.length - 1) sb.append(' ');
        }
        return sb.toString();
    }
}
