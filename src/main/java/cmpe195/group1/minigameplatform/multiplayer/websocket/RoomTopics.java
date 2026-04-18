package cmpe195.group1.minigameplatform.multiplayer.websocket;

import lombok.experimental.UtilityClass;

@UtilityClass
public final class RoomTopics {

    public static String clientTopic(String gameKey, String clientToken) {
        return "/topic/" + gameKey + "/client/" + clientToken;
    }

    public static String roomTopic(String gameKey, String roomCode) {
        return "/topic/" + gameKey + "/room/" + roomCode;
    }
}
