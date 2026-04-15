package cmpe195.group1.minigameplatform;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.List;

@Configuration
@EnableWebSecurity
public class SecurityConfiguration {
    /**
     * Configures Spring Security to require JWT authentication for all requests to /auth/**
     */
    @Bean
    @SuppressWarnings("Convert2MethodRef")
    public SecurityFilterChain filterChain(HttpSecurity http) {
        return http.authorizeHttpRequests(a ->
                        a.requestMatchers("/auth/**").authenticated()
                                .anyRequest().anonymous())
                .oauth2ResourceServer(o ->
                        o.jwt(Customizer.withDefaults()))
                .csrf(c -> c.disable())
                .cors(Customizer.withDefaults())
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        var config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(
                "http://localhost:5173",
                "http://localhost:4173"
        ));
        config.setAllowedMethods(List.of("*"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowedOriginPatterns(List.of("*"));
        config.setAllowCredentials(true); // If credentials like cookies or Authorization headers are used

        var source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

}