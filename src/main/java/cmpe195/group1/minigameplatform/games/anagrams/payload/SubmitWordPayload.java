package cmpe195.group1.minigameplatform.games.anagrams.payload;

import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class SubmitWordPayload extends RoomScopedPayload {
    private String word;
}

