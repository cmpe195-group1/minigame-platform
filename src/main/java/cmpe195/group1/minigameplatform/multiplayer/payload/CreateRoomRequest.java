package cmpe195.group1.minigameplatform.multiplayer.payload;

public class CreateRoomRequest {
    private String clientToken;
    private String playerName;
    private String hostName;
    private Integer maxPlayers;

    public String getClientToken() {
        return clientToken;
    }

    public void setClientToken(String clientToken) {
        this.clientToken = clientToken;
    }

    public String getPlayerName() {
        return playerName;
    }

    public void setPlayerName(String playerName) {
        this.playerName = playerName;
    }

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public Integer getMaxPlayers() {
        return maxPlayers;
    }

    public void setMaxPlayers(Integer maxPlayers) {
        this.maxPlayers = maxPlayers;
    }

    public String resolvePlayerName() {
        if (playerName != null && !playerName.isBlank()) {
            return playerName;
        }
        if (hostName != null && !hostName.isBlank()) {
            return hostName;
        }
        return null;
    }
}
