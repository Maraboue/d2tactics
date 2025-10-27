package com.d2tactics.conifg;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.dataformat.yaml.YAMLFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;
import org.springframework.http.converter.json.Jackson2ObjectMapperBuilder;

@Configuration
public class JacksonConfig {

    /** Primary JSON mapper used by Spring WebFlux HTTP message writers */
    @Bean
    @Primary
    public ObjectMapper jsonObjectMapper(Jackson2ObjectMapperBuilder builder) {
        // IMPORTANT: no YAMLFactory here → pure JSON
        return builder.build();
    }

    /** Optional YAML mapper — only use via @Qualifier("yamlObjectMapper") */
    @Bean("yamlObjectMapper")
    public ObjectMapper yamlObjectMapper(Jackson2ObjectMapperBuilder builder) {
        return builder.factory(new YAMLFactory()).build();
    }
}
