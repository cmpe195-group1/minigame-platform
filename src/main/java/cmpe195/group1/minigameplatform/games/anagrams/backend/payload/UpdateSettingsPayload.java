package cmpe195.group1.minigameplatform.games.anagrams.backend.payload;

import cmpe195.group1.minigameplatform.games.anagrams.backend.model.RoomState;

public class UpdateSettingsPayload {
    private String roomCode;
    private String roomId;
    private RoomState.GameSettings settings;

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomId() {
        return roomId;
    }

    public void setRoomId(String roomId) {
        this.roomId = roomId;
    }

    public RoomState.GameSettings getSettings() {
        return settings;
    }

    public void setSettings(RoomState.GameSettings settings) {
        this.settings = settings;
    }

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

