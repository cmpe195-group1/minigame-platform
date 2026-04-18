package cmpe195.group1.minigameplatform.multiplayer.payload;

import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class JoinRoomRequest extends RoomScopedPayload {
    private String clientToken;
    private String playerName;
}
