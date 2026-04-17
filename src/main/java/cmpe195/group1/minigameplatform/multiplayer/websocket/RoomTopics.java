package cmpe195.group1.minigameplatform.multiplayer.websocket;

public final class RoomTopics {

    private RoomTopics() {
    }

    public static String clientTopic(String gameKey, String clientToken) {
        return "/topic/" + gameKey + "/client/" + clientToken;
    }

    public static String roomTopic(String gameKey, String roomCode) {
        return "/topic/" + gameKey + "/room/" + roomCode;
    }
}
