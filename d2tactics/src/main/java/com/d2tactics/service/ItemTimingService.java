package com.d2tactics.service;

import com.d2tactics.client.OpenDotaClient;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;

import java.time.Duration;
import java.util.*;

@Service
public class ItemTimingService {

    private final OpenDotaClient client;

    public ItemTimingService(OpenDotaClient client) {
        this.client = client;
    }

    /** Median purchase minute per item for the hero across recent public matches. */
    public Mono<JsonNode> medianTimings(long heroId, int minCount, int limit) {
        // Explorer schema: player_matches.purchase_log is jsonb with [{"time":123,"key":"blink"},...]
        // We aggregate per item key and compute median minutes.
        String sql = """
            WITH pls AS (
              SELECT pm.purchase_log
              FROM player_matches pm
              WHERE pm.hero_id = %d
              AND pm.purchase_log IS NOT NULL
              LIMIT 50000
            ),
            items AS (
              SELECT (pl->>'key') AS item_key,
                     ((pl->>'time')::int)/60.0 AS minute
              FROM pls, LATERAL jsonb_array_elements(purchase_log) AS pl
              WHERE (pl->>'time') ~ '^[0-9]+$'
            ),
            agg AS (
              SELECT item_key,
                     percentile_disc(0.5) WITHIN GROUP (ORDER BY minute) AS median_min,
                     COUNT(*) AS uses
              FROM items
              GROUP BY item_key
              HAVING COUNT(*) >= %d
            )
            SELECT item_key, median_min, uses
            FROM agg
            ORDER BY median_min
            LIMIT %d;
            """.formatted(heroId, Math.max(5, minCount), Math.max(10, limit));

        // ItemTimingService.java – unchanged SQL, but tolerate empty explorer()
        return client.explorer(sql)
                .timeout(Duration.ofSeconds(15))
                .onErrorResume(ex -> Mono.just(JsonNodeFactory.instance.objectNode())) // network/other errors => {}
                .map(root -> {
                    var rows = root.path("rows");
                    ObjectNode out = JsonNodeFactory.instance.objectNode();
                    if (rows.isMissingNode() || !rows.isArray()) return out; // {}
                    for (JsonNode r : rows) {
                        String key = r.path("item_key").asText("");
                        double minute = r.path("median_min").asDouble(0.0);
                        int uses = r.path("uses").asInt(0);
                        if (!key.isBlank()) {
                            ObjectNode obj = JsonNodeFactory.instance.objectNode();
                            obj.put("minute", minute);
                            obj.put("uses", uses);
                            out.set(key, obj);
                        }
                    }
                    return out;
                });

    }
}
