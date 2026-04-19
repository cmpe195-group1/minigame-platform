package cmpe195.group1.minigameplatform.games.chess.model;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class ChessGameState {
    private List<List<ChessPiece>> board;
    private String turn;
    private ChessPosition selected;
}
