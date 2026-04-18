package cmpe195.group1.minigameplatform.multiplayer.websocket;

import cmpe195.group1.minigameplatform.multiplayer.payload.RoomServerMessage;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

public abstract class AbstractRoomStompController<R> {
    private final String gameKey;

    protected final SimpMessagingTemplate messagingTemplate;
    protected final StompSessionRegistry sessionRegistry;

    protected AbstractRoomStompController(
            String gameKey,
            SimpMessagingTemplate messagingTemplate,
            StompSessionRegistry sessionRegistry
    ) {
        this.gameKey = gameKey;
        this.messagingTemplate = messagingTemplate;
        this.sessionRegistry = sessionRegistry;
    }

    protected void bindClientSession(String sessionId, String clientToken) {
        if (sessionId == null || clientToken == null || clientToken.isBlank()) {
            return;
        }
        sessionRegistry.bindClient(sessionId, clientToken);
    }

    protected String getSessionId(SimpMessageHeaderAccessor headers) {
        return headers != null ? headers.getSessionId() : null;
    }

    protected String getClientToken(SimpMessageHeaderAccessor headers) {
        String sessionId = getSessionId(headers);
        return sessionId != null ? sessionRegistry.getClientToken(sessionId) : null;
    }

    protected void rememberRoomCode(String sessionId, String roomCode) {
        if (sessionId != null) {
            sessionRegistry.setRoomCode(sessionId, roomCode);
        }
    }

    protected void clearRoomCode(String sessionId) {
        if (sessionId != null) {
            sessionRegistry.clearRoomCode(sessionId);
        }
    }

    protected StompSessionRegistry.SessionInfo removeSession(SessionDisconnectEvent event) {
        if (event == null) {
            return null;
        }
        return sessionRegistry.remove(event.getSessionId());
    }

    protected void broadcastRoom(String roomCode, R room) {
        messagingTemplate.convertAndSend(
                RoomTopics.roomTopic(gameKey, roomCode),
                RoomServerMessage.roomState(room)
        );
    }

    protected void sendRoomState(String clientToken, R room) {
        sendToClient(clientToken, RoomServerMessage.roomState(room));
    }

    protected void sendError(String clientToken, String error) {
        sendToClient(clientToken, RoomServerMessage.error(error));
    }

    protected void sendJoinError(String clientToken, String error) {
        sendToClient(clientToken, RoomServerMessage.joinError(error));
    }

    protected void sendToClient(String clientToken, Object message) {
        messagingTemplate.convertAndSend(RoomTopics.clientTopic(gameKey, clientToken), message);
    }
}
