package cmpe195.group1.minigameplatform.integration;

import cmpe195.group1.minigameplatform.multiplayer.payload.CreateRoomRequest;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import cmpe195.group1.minigameplatform.multiplayer.websocket.RoomTopics;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.messaging.converter.JacksonJsonMessageConverter;
import org.springframework.messaging.simp.stomp.StompFrameHandler;
import org.springframework.messaging.simp.stomp.StompHeaders;
import org.springframework.messaging.simp.stomp.StompSession;
import org.springframework.messaging.simp.stomp.StompSessionHandlerAdapter;
import org.springframework.web.socket.client.standard.StandardWebSocketClient;
import org.springframework.web.socket.messaging.WebSocketStompClient;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
abstract class AbstractGameWebSocketIntegrationSupport {

    private static final long MESSAGE_TIMEOUT_SECONDS = 5;

    @LocalServerPort
    private int port;

    private WebSocketStompClient stompClient;
    private final List<StompSession> openSessions = new ArrayList<>();

    @BeforeEach
    void startStompClient() {
        stompClient = new WebSocketStompClient(new StandardWebSocketClient());
        stompClient.setMessageConverter(new JacksonJsonMessageConverter());
        stompClient.setDefaultHeartbeat(new long[] {0, 0});
        stompClient.start();
    }

    @AfterEach
    void stopStompClient() {
        for (StompSession session : openSessions) {
            if (session != null && session.isConnected()) {
                try {
                    session.disconnect();
                } catch (RuntimeException ignored) {
                    // best-effort cleanup for test sessions
                }
            }
        }
        openSessions.clear();

        if (stompClient != null) {
            stompClient.stop();
        }
    }

    protected StompSession connect() throws Exception {
        StompSession session = stompClient.connectAsync(webSocketUrl(), new StompSessionHandlerAdapter() {
        }).get(MESSAGE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        openSessions.add(session);
        return session;
    }

    protected BlockingQueue<Map<String, Object>> subscribeClientTopic(StompSession session, String gameKey, String clientToken) {
        return subscribeJson(session, RoomTopics.clientTopic(gameKey, clientToken));
    }

    protected BlockingQueue<Map<String, Object>> subscribeRoomTopic(StompSession session, String gameKey, String roomCode) {
        return subscribeJson(session, RoomTopics.roomTopic(gameKey, roomCode));
    }

    protected BlockingQueue<Map<String, Object>> subscribeJson(StompSession session, String destination) {
        BlockingQueue<Map<String, Object>> messages = new LinkedBlockingQueue<>();
        session.subscribe(destination, new JsonFrameHandler(messages));
        return messages;
    }

    protected void send(StompSession session, String destination, Object payload) {
        session.send(destination, payload);
    }

    protected Map<String, Object> awaitMessage(BlockingQueue<Map<String, Object>> messages) throws InterruptedException {
        Map<String, Object> message = messages.poll(MESSAGE_TIMEOUT_SECONDS, TimeUnit.SECONDS);
        assertThat(message)
            .as("message from subscribed STOMP destination")
            .isNotNull();
        return message;
    }

    protected Map<String, Object> awaitRoomState(BlockingQueue<Map<String, Object>> messages) throws InterruptedException {
        Map<String, Object> message = awaitMessage(messages);
        assertThat(message.get("type")).isEqualTo("ROOM_STATE");
        assertThat(message).containsKey("roomState");
        return map(message.get("roomState"));
    }

    @SuppressWarnings("unchecked")
    protected Map<String, Object> map(Object value) {
        return (Map<String, Object>) value;
    }

    @SuppressWarnings("unchecked")
    protected List<Object> list(Object value) {
        return (List<Object>) value;
    }

    protected String text(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value != null ? value.toString() : null;
    }

    protected int intValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof Number number ? number.intValue() : Integer.parseInt(value.toString());
    }

    protected boolean booleanValue(Map<String, Object> payload, String key) {
        Object value = payload.get(key);
        return value instanceof Boolean bool ? bool : Boolean.parseBoolean(String.valueOf(value));
    }

    protected String extractRoomCode(Map<String, Object> roomState) {
        if (roomState.get("roomCode") != null) {
            return roomState.get("roomCode").toString();
        }
        if (roomState.get("id") != null) {
            return roomState.get("id").toString();
        }
        return null;
    }

    protected Map<String, Object> payload(String... keyValues) {
        Map<String, Object> payload = new LinkedHashMap<>();
        for (int i = 0; i < keyValues.length; i += 2) {
            payload.put(keyValues[i], keyValues[i + 1]);
        }
        return payload;
    }

    protected CreateRoomRequest createRoomRequest(String clientToken, String playerName) {
        CreateRoomRequest request = new CreateRoomRequest();
        request.setClientToken(clientToken);
        request.setPlayerName(playerName);
        return request;
    }

    protected RoomScopedPayload.JoinRoomRequest joinRoomRequest(String clientToken, String roomCode, String playerName) {
        RoomScopedPayload.JoinRoomRequest request = new RoomScopedPayload.JoinRoomRequest();
        request.setClientToken(clientToken);
        request.setRoomCode(roomCode);
        request.setPlayerName(playerName);
        return request;
    }

    protected RoomScopedPayload.RoomCodeRequest roomCodeRequest(String roomCode) {
        RoomScopedPayload.RoomCodeRequest request = new RoomScopedPayload.RoomCodeRequest();
        request.setRoomCode(roomCode);
        return request;
    }

    protected RoomScopedPayload.RoomCodeRequest roomIdRequest(String roomId) {
        RoomScopedPayload.RoomCodeRequest request = new RoomScopedPayload.RoomCodeRequest();
        request.setRoomId(roomId);
        return request;
    }

    protected String uniqueToken(String prefix) {
        return prefix + '-' + UUID.randomUUID().toString().substring(0, 8);
    }

    protected String uniqueRoomId(String prefix) {
        return (prefix + UUID.randomUUID().toString().replace("-", "").substring(0, 8))
            .toUpperCase(Locale.ROOT);
    }

    private String webSocketUrl() {
        return "ws://127.0.0.1:" + port + "/ws";
    }

    private static final class JsonFrameHandler implements StompFrameHandler {
        private final BlockingQueue<Map<String, Object>> messages;

        private JsonFrameHandler(BlockingQueue<Map<String, Object>> messages) {
            this.messages = messages;
        }

        @Override
        public Type getPayloadType(StompHeaders headers) {
            return Map.class;
        }

        @Override
        public void handleFrame(StompHeaders headers, Object payload) {
            messages.add((Map<String, Object>) payload);
        }
    }
}


