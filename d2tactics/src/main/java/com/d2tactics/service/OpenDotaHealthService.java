package com.d2tactics.service;

import com.d2tactics.client.OpenDotaClient;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.stereotype.Service;
import reactor.core.publisher.Mono;
import reactor.util.retry.Retry;

import java.time.Duration;

@Service
public class OpenDotaHealthService {

    private final OpenDotaClient client;

    public OpenDotaHealthService(OpenDotaClient client) {
        this.client = client;
    }

    /**
     * Fetches health JSON from OpenDota (reactive).
     * - Times out after 5 seconds
     * - Retries up to 2 times on transient errors
     */
    public Mono<JsonNode> fetchHealth() {
        return client.getHealth()
                .timeout(Duration.ofSeconds(5))
                .retryWhen(Retry.backoff(2, Duration.ofMillis(250)));
    }
}
