package cmpe195.group1.minigameplatform.games.knockout.payload;

import cmpe195.group1.minigameplatform.games.knockout.model.KnockoutGameState;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ResolveTurnPayload {
    private String roomCode;
    private KnockoutGameState resultingState;
}