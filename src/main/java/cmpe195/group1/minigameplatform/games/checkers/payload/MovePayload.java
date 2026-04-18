package cmpe195.group1.minigameplatform.games.checkers.payload;

import cmpe195.group1.minigameplatform.games.checkers.model.CheckersGameState;
import cmpe195.group1.minigameplatform.games.checkers.model.CheckersPosition;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class MovePayload {
    private String roomCode;
    private CheckersPosition from;
    private CheckersPosition to;
    private CheckersGameState resultingState;

}
