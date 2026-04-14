package cmpe195.group1.minigameplatform.checkers.backend.payload;

public class CreateRoomPayload {
    private String hostName;
    private String clientToken;

    public String getHostName() {
        return hostName;
    }

    public void setHostName(String hostName) {
        this.hostName = hostName;
    }

    public String getClientToken() {
        return clientToken;
    }

    public void setClientToken(String clientToken) {
        this.clientToken = clientToken;
    }
}
