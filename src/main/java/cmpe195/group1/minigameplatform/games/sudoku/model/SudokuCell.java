package cmpe195.group1.minigameplatform.games.sudoku.model;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@AllArgsConstructor
@Setter
@Getter
public class SudokuCell {
    private int row;
    private int col;
    private int value;
    private boolean isGiven;
    private Integer playerId;
    private Boolean isCorrect;
    private int solvedValue;
}
