package cmpe195.group1.minigameplatform.multiplayer.payload;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CreateRoomRequest {
    private String clientToken;
    private String playerName;
    private String hostName;
    private Integer maxPlayers;


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
