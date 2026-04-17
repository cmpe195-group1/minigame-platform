package cmpe195.group1.minigameplatform.multiplayer.payload;

public class JoinRoomRequest {
    private String clientToken;
    private String roomCode;
    private String roomId;
    private String playerName;

    public String getClientToken() {
        return clientToken;
    }

    public void setClientToken(String clientToken) {
        this.clientToken = clientToken;
    }

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

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
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
