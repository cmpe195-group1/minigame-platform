package cmpe195.group1.minigameplatform.games.uno.payload;

import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class SubmitActionPayload extends RoomScopedPayload {
    private String kind;
    private String cardId;
    private String chosenColor;

}

