package cmpe195.group1.minigameplatform.multiplayer.websocket;

import cmpe195.group1.minigameplatform.multiplayer.payload.RoomServerMessage;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class AbstractRoomStompControllerTest {

    private SimpMessagingTemplate messagingTemplate;
    private StompSessionRegistry sessionRegistry;
    private TestRoomController controller;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        sessionRegistry = new StompSessionRegistry();
        controller = new TestRoomController(messagingTemplate, sessionRegistry);
    }

    @Test
    void bindAndLookupHelpers_ignoreInvalidInputsAndReadHeaders() {
        controller.bind(null, "client-1");
        controller.bind("session-1", null);
        controller.bind("session-1", "   ");

        assertThat(sessionRegistry.getClientToken("session-1")).isNull();
        assertThat(controller.sessionId(null)).isNull();
        assertThat(controller.clientToken(null)).isNull();

        SimpMessageHeaderAccessor headers = mock(SimpMessageHeaderAccessor.class);
        when(headers.getSessionId()).thenReturn("session-2");

        controller.bind("session-2", "client-2");

        assertThat(controller.sessionId(headers)).isEqualTo("session-2");
        assertThat(controller.clientToken(headers)).isEqualTo("client-2");
    }

    @Test
    void roomCodeHelpers_updateRegistryState() {
        controller.bind("session-1", "client-1");

        controller.remember("session-1", "ROOM1");

        StompSessionRegistry.SessionInfo remembered = sessionRegistry.remove("session-1");
        assertThat(remembered.getRoomCode()).isEqualTo("ROOM1");

        controller.bind("session-2", "client-2");
        controller.remember("session-2", "ROOM2");
        controller.clear("session-2");

        StompSessionRegistry.SessionInfo cleared = sessionRegistry.remove("session-2");
        assertThat(cleared.getRoomCode()).isNull();
    }

    @Test
    void removeSession_returnsNullForNullEventAndRemovesExistingSession() {
        controller.bind("session-3", "client-3");
        controller.remember("session-3", "ROOM3");

        assertThat(controller.remove(null)).isNull();

        SessionDisconnectEvent event = mock(SessionDisconnectEvent.class);
        when(event.getSessionId()).thenReturn("session-3");

        StompSessionRegistry.SessionInfo removed = controller.remove(event);
        assertThat(removed.getClientToken()).isEqualTo("client-3");
        assertThat(removed.getRoomCode()).isEqualTo("ROOM3");
        assertThat(sessionRegistry.getClientToken("session-3")).isNull();
    }

    @Test
    void messagingHelpers_sendExpectedDestinationsAndPayloads() {
        controller.broadcast("ROOM1", "state-1");
        controller.sendState("client-1", "state-2");
        controller.sendErrorMessage("client-2", "boom");
        controller.sendJoinErrorMessage("client-3", "join failed");
        controller.sendDirect("client-4", "custom");

        ArgumentCaptor<String> destinationCaptor = ArgumentCaptor.forClass(String.class);
        ArgumentCaptor<Object> payloadCaptor = ArgumentCaptor.forClass(Object.class);
        verify(messagingTemplate, times(5)).convertAndSend(destinationCaptor.capture(), payloadCaptor.capture());

        assertThat(destinationCaptor.getAllValues()).containsExactly(
                "/topic/test-game/room/ROOM1",
                "/topic/test-game/client/client-1",
                "/topic/test-game/client/client-2",
                "/topic/test-game/client/client-3",
                "/topic/test-game/client/client-4"
        );

        List<Object> payloads = payloadCaptor.getAllValues();
        assertServerMessage(payloads.get(0), "ROOM_STATE", "state-1", null);
        assertServerMessage(payloads.get(1), "ROOM_STATE", "state-2", null);
        assertServerMessage(payloads.get(2), "ERROR", null, "boom");
        assertServerMessage(payloads.get(3), "JOIN_ERROR", null, "join failed");
        assertThat(payloads.get(4)).isEqualTo("custom");
    }

    private void assertServerMessage(Object payload, String type, String roomState, String error) {
        assertThat(payload).isInstanceOf(RoomServerMessage.class);
        RoomServerMessage<?> message = (RoomServerMessage<?>) payload;
        assertThat(message.getType()).isEqualTo(type);
        assertThat(message.getRoomState()).isEqualTo(roomState);
        assertThat(message.getError()).isEqualTo(error);
    }

    private static final class TestRoomController extends AbstractRoomStompController<String> {

        private TestRoomController(SimpMessagingTemplate messagingTemplate, StompSessionRegistry sessionRegistry) {
            super("test-game", messagingTemplate, sessionRegistry);
        }

        private void bind(String sessionId, String clientToken) {
            bindClientSession(sessionId, clientToken);
        }

        private String sessionId(SimpMessageHeaderAccessor headers) {
            return getSessionId(headers);
        }

        private String clientToken(SimpMessageHeaderAccessor headers) {
            return getClientToken(headers);
        }

        private void remember(String sessionId, String roomCode) {
            rememberRoomCode(sessionId, roomCode);
        }

        private void clear(String sessionId) {
            clearRoomCode(sessionId);
        }

        private StompSessionRegistry.SessionInfo remove(SessionDisconnectEvent event) {
            return removeSession(event);
        }

        private void broadcast(String roomCode, String room) {
            broadcastRoom(roomCode, room);
        }

        private void sendState(String clientToken, String room) {
            sendRoomState(clientToken, room);
        }

        private void sendErrorMessage(String clientToken, String error) {
            sendError(clientToken, error);
        }

        private void sendJoinErrorMessage(String clientToken, String error) {
            sendJoinError(clientToken, error);
        }

        private void sendDirect(String clientToken, Object message) {
            sendToClient(clientToken, message);
        }
    }
}


