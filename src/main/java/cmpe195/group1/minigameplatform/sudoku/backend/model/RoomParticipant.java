package cmpe195.group1.minigameplatform.sudoku.backend.model;

public class RoomParticipant {
    private int playerId;
    private String name;
    private String color;
    private String colorName;
    private String clientId;

    public RoomParticipant() {
    }

    public RoomParticipant(int playerId, String name, String color, String colorName, String clientId) {
        this.playerId = playerId;
        this.name = name;
        this.color = color;
        this.colorName = colorName;
        this.clientId = clientId;
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

    public String getColor() {
        return color;
    }

    public void setColor(String color) {
        this.color = color;
    }

    public String getColorName() {
        return colorName;
    }

    public void setColorName(String colorName) {
        this.colorName = colorName;
    }

    public String getClientId() {
        return clientId;
    }

    public void setClientId(String clientId) {
        this.clientId = clientId;
    }
}
