package cmpe195.group1.minigameplatform.games.checkers.backend.model;

public class RoomParticipant {
    private int playerId;
    private String name;
    private String clientId;
    private String pieceColor;

    public RoomParticipant() {
    }

    public RoomParticipant(int playerId, String name, String clientId, String pieceColor) {
        this.playerId = playerId;
        this.name = name;
        this.clientId = clientId;
        this.pieceColor = pieceColor;
    }

    public int getPlayerId() {
        return playerId;
    }

    public void setPlayerId(int playerId) {
        this.playerId = playerId;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }

    public String getPieceColor() {
        return pieceColor;
    }

    public void setPieceColor(String pieceColor) {
        this.pieceColor = pieceColor;
    }
}
