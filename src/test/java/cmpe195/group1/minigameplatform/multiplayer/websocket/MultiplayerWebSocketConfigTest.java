package cmpe195.group1.minigameplatform.multiplayer.websocket;

import org.junit.jupiter.api.Test;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.StompWebSocketEndpointRegistration;

import static org.mockito.Mockito.*;

class MultiplayerWebSocketConfigTest {

    @Test
    void configureMessageBroker_registersTopicBrokerAndAppPrefix() {
        MultiplayerWebSocketConfig config = new MultiplayerWebSocketConfig();
        MessageBrokerRegistry registry = mock(MessageBrokerRegistry.class);

        config.configureMessageBroker(registry);

        verify(registry).enableSimpleBroker("/topic");
        verify(registry).setApplicationDestinationPrefixes("/app");
    }

    @Test
    void registerStompEndpoints_registersWsEndpointWithWildcardOrigins() {
        MultiplayerWebSocketConfig config = new MultiplayerWebSocketConfig();
        StompEndpointRegistry registry = mock(StompEndpointRegistry.class);
        StompWebSocketEndpointRegistration endpointRegistration = mock(StompWebSocketEndpointRegistration.class);
        when(registry.addEndpoint("/ws")).thenReturn(endpointRegistration);

        config.registerStompEndpoints(registry);

        verify(registry).addEndpoint("/ws");
        verify(endpointRegistration).setAllowedOriginPatterns("*");
    }
}

