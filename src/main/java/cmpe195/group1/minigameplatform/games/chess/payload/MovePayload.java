package cmpe195.group1.minigameplatform.games.chess.payload;
import cmpe195.group1.minigameplatform.games.chess.model.ChessGameState;
import cmpe195.group1.minigameplatform.games.chess.model.ChessPosition;
import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class MovePayload {
    private String roomCode;
    private ChessPosition from;
    private ChessPosition to;
    private ChessGameState resultingState;
}
