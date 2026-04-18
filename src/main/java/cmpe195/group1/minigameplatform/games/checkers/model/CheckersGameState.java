package cmpe195.group1.minigameplatform.games.checkers.model;

import lombok.Getter;
import lombok.Setter;

import java.util.List;

@Setter
@Getter
public class CheckersGameState {
    private List<List<CheckersPiece>> board;
    private String turn;
    private CheckersPosition selected;

}
