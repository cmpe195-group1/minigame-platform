package cmpe195.group1.minigameplatform.multiplayer.payload;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class RoomScopedPayload {
    private String roomCode;
    private String roomId;

    public String resolveRoomCode() {
        if (roomCode != null && !roomCode.isBlank()) {
            return roomCode;
        }
        if (roomId != null && !roomId.isBlank()) {
            return roomId;
        }
        return null;
    }

    @Getter
    @Setter
    public static class RoomCodeRequest extends RoomScopedPayload {
    }

    @Getter
    @Setter
    public static class JoinRoomRequest extends RoomScopedPayload {
        private String clientToken;
        private String playerName;
    }
}

