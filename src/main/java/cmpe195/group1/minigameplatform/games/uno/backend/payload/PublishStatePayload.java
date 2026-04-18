package cmpe195.group1.minigameplatform.games.uno.backend.payload;

import cmpe195.group1.minigameplatform.games.uno.backend.model.RoomState;

public class PublishStatePayload {
    private String roomCode;
    private String roomId;
    private RoomState.BroadcastGameState gameState;

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

    public RoomState.BroadcastGameState getGameState() {
        return gameState;
    }

    public void setGameState(RoomState.BroadcastGameState gameState) {
        this.gameState = gameState;
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

