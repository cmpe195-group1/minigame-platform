package cmpe195.group1.minigameplatform.games.uno.backend.payload;

public class SubmitActionPayload {
    private String roomCode;
    private String roomId;
    private String kind;
    private String cardId;
    private String chosenColor;

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

    public String getKind() {
        return kind;
    }

    public void setKind(String kind) {
        this.kind = kind;
    }

    public String getCardId() {
        return cardId;
    }

    public void setCardId(String cardId) {
        this.cardId = cardId;
    }

    public String getChosenColor() {
        return chosenColor;
    }

    public void setChosenColor(String chosenColor) {
        this.chosenColor = chosenColor;
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

