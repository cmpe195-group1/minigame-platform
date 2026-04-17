package cmpe195.group1.minigameplatform.multiplayer.websocket;

import org.springframework.stereotype.Component;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class StompSessionRegistry {

    public static class SessionInfo {
        private final String clientToken;
        private volatile String roomCode;

        public SessionInfo(String clientToken) {
            this.clientToken = clientToken;
        }

        public String getClientToken() {
            return clientToken;
        }

        public String getRoomCode() {
            return roomCode;
        }

        public void setRoomCode(String roomCode) {
            this.roomCode = roomCode;
        }
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
