package com.d2tactics.service;

import com.d2tactics.client.OpenDotaClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

/**
 * Service layer for hero-related endpoints in the OpenDota API.
 */
@Service
public class OpenDotaHeroService {

    private final OpenDotaClient client;

    public OpenDotaHeroService(OpenDotaClient client) {
        this.client = client;
    }

    /**
     * Fetches item popularity for a given hero ID.
     * Adds timeout and retry to keep behavior consistent with the health service.
     *
     * @param heroId the OpenDota hero_id (e.g. 1 = Anti-Mage)
     * @return Mono<JsonNode> representing the response body
     */
    public Mono<JsonNode> fetchHeroItemPopularity(long heroId) {
        return client.getHeroItemPopularity(heroId)
                .timeout(Duration.ofSeconds(5))
                .retryWhen(Retry.backoff(2, Duration.ofMillis(250)));
    }




}
