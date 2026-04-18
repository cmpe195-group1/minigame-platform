package cmpe195.group1.minigameplatform.games.trivia.payload;

import cmpe195.group1.minigameplatform.games.trivia.model.RoomState;
import cmpe195.group1.minigameplatform.multiplayer.payload.RoomScopedPayload;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class PublishStatePayload extends RoomScopedPayload {
    private RoomState.BroadcastGameState gameState;
}

