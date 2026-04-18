package cmpe195.group1.minigameplatform.games.sudoku.payload;

import lombok.Getter;
import lombok.Setter;

@Setter
@Getter
public class MakeMovePayload {
    private String roomCode;
    private int row;
    private int col;
    private int num;
    private int playerId;

}
