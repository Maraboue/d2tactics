package com.d2tactics.client;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.JsonNodeFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.MediaType;
import org.springframework.http.codec.ClientCodecConfigurer;
import org.springframework.stereotype.Component;
import org.springframework.web.reactive.function.client.ClientRequest;
import org.springframework.web.reactive.function.client.ExchangeFilterFunction;
import org.springframework.web.reactive.function.client.ExchangeStrategies;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.util.UriComponentsBuilder;
import reactor.core.publisher.Mono;

import java.net.URI;
import java.util.Map;

/**
 * Reactive WebFlux client for OpenDota.
 * Always returns JSON (as Jackson JsonNode).
 */
@Component
public class OpenDotaClient {

    private final WebClient client;

    public OpenDotaClient(
            @Value("${opendota.base-url:https://api.opendota.com/api}") String baseUrl,
            @Value("${opendota.api-key:}") String apiKey
    ) {
        this.client = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Accept", MediaType.APPLICATION_JSON_VALUE)
                .defaultHeader("Content-Type", MediaType.APPLICATION_JSON_VALUE)
                .filter(addApiKeyAsQueryParam(apiKey))
                .exchangeStrategies(ExchangeStrategies.builder()
                        .codecs((ClientCodecConfigurer config) ->
                                // pick a size that fits the constants payload comfortably
                                config.defaultCodecs().maxInMemorySize(10 * 1024 * 1024) // 10 MB
                        )
                        .build())
                .build();
    }

    /** Filter that appends ?api_key=... iff a non-blank key is provided. */
    private static ExchangeFilterFunction addApiKeyAsQueryParam(String apiKey) {
        final String key = (apiKey == null || apiKey.isBlank()) ? null : apiKey;
        if (key == null) return ExchangeFilterFunction.ofRequestProcessor(Mono::just);

        return ExchangeFilterFunction.ofRequestProcessor(req -> {
            URI newUri = UriComponentsBuilder.fromUri(req.url())
                    .queryParam("api_key", key)
                    .build(true)
                    .toUri();

            ClientRequest newReq = ClientRequest.from(req)
                    .url(newUri)
                    .build();

            return Mono.just(newReq);
        });
    }


    /** GET /health */
    public Mono<JsonNode> getHealth() {
        return client.get()
                .uri("/health")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty(statusText(resp.statusCode().value()))
                                .flatMap(body -> Mono.error(new OpenDotaException(body))))
                .bodyToMono(JsonNode.class);
    }

    /** GET /heroes/{hero_id}/itemPopularity */
    public Mono<JsonNode> getHeroItemPopularity(long heroId) {
        return client.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/heroes/{hero_id}/itemPopularity")
                        .build(heroId))
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .onStatus(HttpStatusCode::isError,
                        resp -> resp.bodyToMono(String.class)
                                .defaultIfEmpty("HTTP " + resp.statusCode().value())
                                .flatMap(body -> Mono.error(new OpenDotaException(body))))
                .bodyToMono(JsonNode.class);
    }

    private static String statusText(int code) {
        return "HTTP " + code;
    }

    /** Domain-specific exception type. */
    public static class OpenDotaException extends RuntimeException {
        public OpenDotaException(String message) { super(message); }
    }

    public Mono<JsonNode> getHeroStats() {
        return client.get()
                .uri("/heroStats")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> getHeroAbilities() {
        return client.get()
                .uri("/constants/hero_abilities")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> getAbilities() {
        return client.get()
                .uri("/constants/abilities")
                .accept(MediaType.APPLICATION_JSON)
                .retrieve()
                .bodyToMono(JsonNode.class);
    }

    public Mono<JsonNode> explorer(String sql) {
        return client.post()
                .uri("/explorer")
                .contentType(MediaType.APPLICATION_JSON)
                .accept(MediaType.APPLICATION_JSON)
                .bodyValue(Map.of("sql", sql))
                .retrieve()
                .onStatus(s -> s.value() == 404, resp -> Mono.empty()) // <-- treat 404 as empty body
                .bodyToMono(JsonNode.class)
                .defaultIfEmpty(JsonNodeFactory.instance.objectNode()); // {}
    }


}
