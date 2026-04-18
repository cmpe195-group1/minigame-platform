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
}

