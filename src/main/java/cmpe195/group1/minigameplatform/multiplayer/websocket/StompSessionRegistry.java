package cmpe195.group1.minigameplatform.multiplayer.websocket;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.Setter;
import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StompSessionRegistry {

    @Getter
    @RequiredArgsConstructor
    public static class SessionInfo {
        private final String clientToken;
        @Setter private volatile String roomCode;
    }

    private final Map<String, SessionInfo> sessions = new ConcurrentHashMap<>();

    public void bindClient(String sessionId, String clientToken) {
        sessions.put(sessionId, new SessionInfo(clientToken));
    }

    public void setRoomCode(String sessionId, String roomCode) {
        SessionInfo info = sessions.get(sessionId);
        if (info != null) {
            info.setRoomCode(roomCode);
        }
    }

    public void clearRoomCode(String sessionId) {
        SessionInfo info = sessions.get(sessionId);
        if (info != null) {
            info.setRoomCode(null);
        }
    }

    public String getClientToken(String sessionId) {
        SessionInfo info = sessions.get(sessionId);
        return info != null ? info.getClientToken() : null;
    }

    public SessionInfo remove(String sessionId) {
        return sessions.remove(sessionId);
    }
}
